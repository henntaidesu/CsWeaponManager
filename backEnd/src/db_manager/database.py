# -*- coding: utf-8 -*-
"""
数据库管理核心类

支持两种后端：
- SQLite（默认，基础数据库始终存在，保存数据库连接配置）
- MySQL（可选，连接参数保存在 SQLite 的 config 表中，启动时读取）

业务层的所有 SQL 仍然使用 SQLite 风格（占位符 ?、标识符 [name]），
在 MySQL 模式下由 _translate_sql() 统一翻译为 MySQL 方言（%s、`name` 等），
因此上层代码无需改动即可兼容两种数据库。
"""

import sqlite3
import os
import sys
import re
import threading
from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Tuple
from ..units.read_conf import read_conf
from .migration_gate import migration_gate


# ============================================================
# 启动引导配置（始终存放在基础 SQLite 的 config 表中）
# ============================================================

# config 表中用于保存数据库连接配置的 key1
_DB_CONF_KEY1 = 'database'
_DB_CONF_KEYS = ['db_type', 'mysql_host', 'mysql_port', 'mysql_user', 'mysql_password', 'mysql_database']


def _resolve_sqlite_path() -> str:
    """解析基础 SQLite 文件的绝对路径（兼容 exe 打包）"""
    conf = read_conf()
    sqlite_file = conf.config.get('database', 'sqlite_file', fallback='csweaponmanager.db')
    if not os.path.isabs(sqlite_file):
        if getattr(sys, 'frozen', False):
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        sqlite_file = os.path.join(base_path, sqlite_file)
    return sqlite_file


def _ensure_config_table(conn: sqlite3.Connection):
    """确保基础 SQLite 中存在 config 表（与 ConfigModel 字段一致）"""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config ("
        "[dataID] INTEGER PRIMARY KEY AUTOINCREMENT, "
        "[dataName] TEXT, [key1] TEXT, [key2] TEXT, "
        "[value] TEXT, [status] TEXT, [steamID] TEXT)"
    )


def read_bootstrap_db_config() -> Dict[str, str]:
    """
    从基础 SQLite 的 config 表读取数据库连接配置。
    始终从本地 SQLite 读取，作为决定连接哪个后端的唯一依据。
    """
    result = {'db_type': 'sqlite', 'mysql_host': '', 'mysql_port': '3306',
              'mysql_user': '', 'mysql_password': '', 'mysql_database': ''}
    try:
        path = _resolve_sqlite_path()
        if not os.path.exists(path):
            return result
        conn = sqlite3.connect(path, timeout=30.0)
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='config'")
            if not cursor.fetchone():
                return result
            cursor.execute(
                "SELECT key2, value FROM config WHERE key1=?", (_DB_CONF_KEY1,))
            for key2, value in cursor.fetchall():
                if key2 in result and value is not None:
                    result[key2] = value
        finally:
            conn.close()
    except Exception as e:
        print(f"读取数据库引导配置失败，回退到 SQLite: {e}")
    if result.get('db_type') not in ('sqlite', 'mysql'):
        result['db_type'] = 'sqlite'
    return result


def write_bootstrap_db_config(config: Dict[str, str]) -> bool:
    """
    将数据库连接配置写入基础 SQLite 的 config 表（引导配置的唯一权威来源）。
    只更新传入的键。
    """
    try:
        path = _resolve_sqlite_path()
        conn = sqlite3.connect(path, timeout=30.0)
        try:
            _ensure_config_table(conn)
            cursor = conn.cursor()
            for key2 in _DB_CONF_KEYS:
                if key2 not in config:
                    continue
                value = config[key2]
                if value is None:
                    value = ''
                cursor.execute(
                    "SELECT dataID FROM config WHERE key1=? AND key2=?",
                    (_DB_CONF_KEY1, key2))
                row = cursor.fetchone()
                if row:
                    cursor.execute(
                        "UPDATE config SET value=? WHERE dataID=?", (str(value), row[0]))
                else:
                    cursor.execute(
                        "INSERT INTO config ([dataName],[key1],[key2],[value],[status]) "
                        "VALUES (?,?,?,?,?)",
                        ('数据库配置', _DB_CONF_KEY1, key2, str(value), '1'))
            conn.commit()
        finally:
            conn.close()
        return True
    except Exception as e:
        print(f"写入数据库引导配置失败: {e}")
        return False


# ============================================================
# SQL 方言翻译（SQLite 风格 -> MySQL 风格）
# ============================================================

# 模型列名中与 MySQL 保留字冲突、且业务 SQL 里会不加引号直接书写的标识符。
# 清单由「所有模型列名 ∩ information_schema.KEYWORDS(RESERVED=1)」得出，当前 schema 命中两个：
# - rename：全仓 37 处裸用，MySQL 下会报 1064，统一在翻译时补反引号
# - from  ：不能放进这里（FROM 同时是子句关键字，补引号会毁掉每条 SQL），
#           业务代码一律写成 "from"，由双引号标识符规则转成反引号
_MYSQL_RESERVED_COLUMNS = frozenset({'rename'})

# GROUP_CONCAT(expr, 'sep') -> GROUP_CONCAT(expr SEPARATOR 'sep')
_GROUP_CONCAT_RE = re.compile(
    r"GROUP_CONCAT\s*\(\s*([^,()]+?)\s*,\s*('(?:[^']|'')*')\s*\)",
    re.IGNORECASE)


def _translate_sql(sql: str, has_params: bool) -> str:
    """
    将 SQLite 风格 SQL 翻译为 MySQL 风格：
    - 标识符 [name] 和 "name" -> `name`
      （MySQL 默认 sql_mode 下 "name" 是字符串字面量而非标识符，必须转换）
    - 占位符 ?      -> %s
    - 字面量 %      -> %%（仅当带参数，避免 pymysql 的 % 格式化报错）
    - GROUP_CONCAT(x, 'sep') -> GROUP_CONCAT(x SEPARATOR 'sep')
    - datetime('now') -> NOW()

    字符串字面量与注释（-- 行注释、/* 块注释 */）内的内容原样保留，
    只转义其中的 %，避免注释里的引号/问号/方括号影响整条语句的解析。
    """
    # MySQL 方言函数改写（在字符级扫描前，按整体正则替换）
    sql = _GROUP_CONCAT_RE.sub(r"GROUP_CONCAT(\1 SEPARATOR \2)", sql)
    sql = re.sub(r"datetime\(\s*'now'\s*\)", "NOW()", sql, flags=re.IGNORECASE)

    def keep(text: str) -> str:
        """原样保留的片段：仅转义字面量 %"""
        return text.replace('%', '%%') if has_params else text

    def scan_ident(start: int) -> int:
        """返回从 start 开始的标识符（字母/下划线开头）的结束位置"""
        j = start
        while j < n and (sql[j].isalnum() or sql[j] in '_$'):
            j += 1
        return j

    def scan_quoted(start: int, quote: str) -> int:
        """返回以 quote 开头的引用片段的结束位置（含收尾引号），支持 '' / "" 转义"""
        j = start + 1
        while j < n:
            if sql[j] == quote:
                if j + 1 < n and sql[j + 1] == quote:
                    j += 2
                    continue
                return j + 1
            j += 1
        return n  # 未闭合，按到末尾处理

    out = []
    i = 0
    n = len(sql)
    while i < n:
        ch = sql[i]

        # -- 行注释
        if ch == '-' and sql.startswith('--', i):
            end = sql.find('\n', i)
            end = n if end < 0 else end
            out.append(keep(sql[i:end]))
            i = end
            continue

        # /* 块注释 */
        if ch == '/' and sql.startswith('/*', i):
            end = sql.find('*/', i + 2)
            end = n if end < 0 else end + 2
            out.append(keep(sql[i:end]))
            i = end
            continue

        # 单引号字符串字面量
        if ch == "'":
            end = scan_quoted(i, "'")
            out.append(keep(sql[i:end]))
            i = end
            continue

        # 双引号标识符（SQLite 风格）-> MySQL 反引号
        if ch == '"':
            end = scan_quoted(i, '"')
            raw = sql[i:end]
            ident = raw[1:-1] if len(raw) >= 2 and raw.endswith('"') else raw[1:]
            out.append('`' + ident.replace('""', '"').replace('`', '``') + '`')
            i = end
            continue

        # [name] 标识符 -> 反引号（整段处理，内容不再参与后续替换）
        if ch == '[':
            end = sql.find(']', i + 1)
            if end < 0:
                out.append('`')
                i += 1
                continue
            out.append('`' + sql[i + 1:end].replace('`', '``') + '`')
            i = end + 1
            continue

        # 已经是反引号标识符的原样保留，避免被重复加引号
        if ch == '`':
            end = sql.find('`', i + 1)
            end = n if end < 0 else end + 1
            out.append(keep(sql[i:end]))
            i = end
            continue

        # 裸标识符：与 MySQL 保留字冲突的列名补反引号
        if ch.isalpha() or ch == '_':
            end = scan_ident(i)
            word = sql[i:end]
            if word.lower() in _MYSQL_RESERVED_COLUMNS:
                out.append(f'`{word}`')
            else:
                out.append(word)
            i = end
            continue

        if ch == '?':
            out.append('%s')
        elif ch == '%' and has_params:
            out.append('%%')
        else:
            out.append(ch)
        i += 1
    return ''.join(out)


# ============================================================
# 类型映射（SQLite 类型 -> MySQL 类型）
# ============================================================

def _mysql_column_type(field: Dict[str, Any], is_indexed: bool) -> str:
    """
    将模型字段定义映射为合理的 MySQL 字段类型。

    支持模型可选类型提示：
    - 'mysql_type': 直接指定 MySQL 类型（最高优先级）
    - 'length':     指定 VARCHAR 长度

    默认映射：
    - INTEGER -> BIGINT
    - REAL    -> DOUBLE
    - NUMERIC/DECIMAL -> DECIMAL(20,6)
    - BLOB    -> LONGBLOB
    - DATETIME/DATE/TIMESTAMP -> VARCHAR(64)
        （本项目把时间统一存为 Python 格式化后的字符串，
          映射为 VARCHAR 可保证读回的 Python 类型与 SQLite 完全一致）
    - BOOLEAN -> TINYINT(1)
    - TEXT    -> 索引列/主键: VARCHAR(255)；否则: LONGTEXT
    """
    if field.get('mysql_type'):
        return field['mysql_type']

    base = (field.get('type') or 'TEXT').upper()

    if 'INT' in base:
        return 'BIGINT'
    if base in ('REAL', 'FLOAT', 'DOUBLE'):
        return 'DOUBLE'
    if base in ('NUMERIC', 'DECIMAL'):
        return 'DECIMAL(20,6)'
    if base in ('BLOB', 'LONGBLOB'):
        return 'LONGBLOB'
    if base in ('DATETIME', 'DATE', 'TIMESTAMP', 'TIME'):
        return 'VARCHAR(64)'
    if base in ('BOOLEAN', 'BOOL'):
        return 'TINYINT(1)'

    # 文本类型
    length = field.get('length')
    if length:
        return f'VARCHAR({int(length)})'
    # MySQL 的 TEXT/BLOB 列不允许设置 DEFAULT（错误 1101），
    # 带默认值的文本列一律按短文本处理，保证默认值能与 SQLite 保持一致
    if is_indexed or field.get('primary_key') or field.get('default') is not None:
        return 'VARCHAR(255)'
    return 'LONGTEXT'


# MySQL 中不允许设置 DEFAULT 的列类型
_MYSQL_NO_DEFAULT_TYPES = ('TEXT', 'BLOB', 'JSON', 'GEOMETRY')


def _mysql_type_allows_default(mysql_type: str) -> bool:
    """该 MySQL 列类型是否允许 DEFAULT 子句"""
    upper = (mysql_type or '').upper()
    return not any(key in upper for key in _MYSQL_NO_DEFAULT_TYPES)


# MySQL 中需要使用前缀长度的文本类型（用于多列复合索引避免超出键长限制）
_MYSQL_TEXTLIKE = ('VARCHAR', 'CHAR', 'TEXT')
_MYSQL_INDEX_PREFIX = 64


class DatabaseManager:
    """数据库管理器 - 单例模式，支持 SQLite / MySQL 双后端"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self._local = threading.local()
            self.db_path = _resolve_sqlite_path()
            # 最近一次建表/改列失败的原因（这些方法只返回 bool，调用方需要时可读取）
            self.last_error = ''
            # 后端代次：每次热切换加一，线程本地的旧连接据此失效重连
            self._backend_generation = 0
            self.initialized = True
            self._load_backend_config()
            self._setup_database()

    # --------------------------------------------------------
    # 后端配置 / 连接
    # --------------------------------------------------------

    def _load_backend_config(self):
        """读取引导配置，决定当前使用的数据库后端"""
        cfg = read_bootstrap_db_config()
        self.db_type = cfg.get('db_type', 'sqlite')
        self.mysql_config = {
            'host': cfg.get('mysql_host', ''),
            'port': int(cfg.get('mysql_port') or 3306),
            'user': cfg.get('mysql_user', ''),
            'password': cfg.get('mysql_password', ''),
            'database': cfg.get('mysql_database', ''),
        }
        self.mysql_database = self.mysql_config['database']
        # MySQL 配置不完整时回退到 SQLite
        if self.db_type == 'mysql':
            if not (self.mysql_config['host'] and self.mysql_config['user']
                    and self.mysql_config['database']):
                print("MySQL 连接配置不完整，回退到 SQLite")
                self.db_type = 'sqlite'

    def _close_local_mysql(self):
        """
        关闭线程本地的 MySQL 连接，并让其他线程的连接失效。

        thread.local 只能访问到当前线程的连接，切换后端时无法直接关掉别的线程持有的连接；
        这里通过递增后端代次，让那些线程在下次取连接时自行丢弃旧连接重连，
        否则热切换到另一个 MySQL 后，旧线程会继续读写切换前的库。
        """
        self._backend_generation += 1
        self._collation = None  # 排序规则随服务器变化，需要重新探测
        conn = getattr(self._local, 'mysql_conn', None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
            self._local.mysql_conn = None

    def reconfigure(self):
        """重新读取引导配置并重置连接（用于运行时切换后端，无需重启）"""
        self._close_local_mysql()
        self._load_backend_config()
        self._setup_database()

    def apply_backend(self, db_type: str, mysql_config: Dict[str, Any] = None):
        """
        直接切换当前进程使用的后端（不写入引导配置）。
        供数据库迁移时临时把单例指向目标库使用。
        """
        self._close_local_mysql()
        self.db_type = db_type if db_type in ('sqlite', 'mysql') else 'sqlite'
        if mysql_config:
            self.mysql_config = {
                'host': mysql_config.get('host', ''),
                'port': int(mysql_config.get('port') or 3306),
                'user': mysql_config.get('user', ''),
                'password': mysql_config.get('password', ''),
                'database': mysql_config.get('database', ''),
            }
            self.mysql_database = self.mysql_config['database']
        self._setup_database()

    def _setup_database(self):
        """初始化后端连接（SQLite 设置 PRAGMA；MySQL 校验连通性）"""
        if self.db_type == 'mysql':
            try:
                conn = self._get_mysql_conn()
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.fetchall()
            except Exception as e:
                print(f"MySQL 连接失败，回退到 SQLite: {e}")
                self.db_type = 'sqlite'
                self._setup_database()
            return
        with self.get_connection() as conn:
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute('PRAGMA synchronous=NORMAL')
            conn.execute('PRAGMA cache_size=1000')
            conn.execute('PRAGMA temp_store=MEMORY')
            conn.execute('PRAGMA foreign_keys=ON')
            conn.commit()

    def mysql_collation(self) -> str:
        """
        与 SQLite 语义一致的排序规则（区分大小写的二进制比较）。

        SQLite 的 TEXT 默认按字节比较，区分大小写；MySQL 默认的 utf8mb4_general_ci
        不区分大小写，会把 SQLite 里合法的两行判成主键冲突。
        优先用 utf8mb4_0900_bin（NO PAD，尾部空格也敏感，与 SQLite 完全一致），
        老版本 MySQL 没有该排序规则时回退到 utf8mb4_bin（PAD SPACE）。
        """
        if getattr(self, '_collation', None) is None:
            self._collation = 'utf8mb4_bin'
            try:
                rows = self.execute_query(
                    "SELECT COLLATION_NAME FROM information_schema.COLLATIONS "
                    "WHERE COLLATION_NAME=?", ('utf8mb4_0900_bin',))
                if rows:
                    self._collation = 'utf8mb4_0900_bin'
            except Exception as e:
                print(f"检测 MySQL 排序规则失败，使用 utf8mb4_bin: {e}")
        return self._collation

    def _get_mysql_conn(self):
        """获取线程本地的 MySQL 连接（断线自动重连；后端热切换后丢弃旧连接）"""
        conn = getattr(self._local, 'mysql_conn', None)
        if conn is not None and getattr(self._local, 'mysql_gen', None) != self._backend_generation:
            # 本线程持有的是切换前的连接，直接丢弃重连
            try:
                conn.close()
            except Exception:
                pass
            conn = None
            self._local.mysql_conn = None
        if conn is not None:
            try:
                conn.ping(reconnect=True)
                return conn
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass
                self._local.mysql_conn = None
        import pymysql
        conn = pymysql.connect(
            host=self.mysql_config['host'],
            port=self.mysql_config['port'],
            user=self.mysql_config['user'],
            password=self.mysql_config['password'],
            database=self.mysql_config['database'],
            charset='utf8mb4',
            autocommit=False,
            connect_timeout=10,
            # 宽松模式：贴近 SQLite 的弱类型行为，避免严格模式下的写入报错
            sql_mode='NO_ENGINE_SUBSTITUTION',
        )
        self._local.mysql_conn = conn
        self._local.mysql_gen = self._backend_generation
        return conn

    @contextmanager
    def get_connection(self):
        """获取数据库连接上下文管理器（迁移期间只允许迁移线程访问）"""
        migration_gate.ensure_allowed()
        if self.db_type == 'mysql':
            conn = self._get_mysql_conn()
            try:
                yield conn
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass
                raise
            # MySQL 连接复用，不在此关闭
        else:
            conn = sqlite3.connect(self.db_path, check_same_thread=False, timeout=30.0)
            try:
                yield conn
            finally:
                conn.close()

    def _prep(self, sql: str, params) -> str:
        """根据后端翻译 SQL（MySQL 模式下转换方言）"""
        if self.db_type == 'mysql':
            return _translate_sql(sql, bool(params))
        return sql

    # --------------------------------------------------------
    # 基础执行接口
    # --------------------------------------------------------

    def execute_query(self, sql: str, params: tuple = ()) -> List[tuple]:
        """执行查询语句"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            tsql = self._prep(sql, params)
            if params:
                cursor.execute(tsql, params)
            else:
                cursor.execute(tsql)
            return cursor.fetchall()

    def execute_update(self, sql: str, params: tuple = ()) -> int:
        """执行更新语句，返回受影响的行数"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            tsql = self._prep(sql, params)
            if params:
                cursor.execute(tsql, params)
            else:
                cursor.execute(tsql)
            conn.commit()
            return cursor.rowcount

    def execute_insert(self, sql: str, params: tuple = ()) -> Optional[int]:
        """执行插入语句，返回最后插入的行ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            tsql = self._prep(sql, params)
            if params:
                cursor.execute(tsql, params)
            else:
                cursor.execute(tsql)
            conn.commit()
            return cursor.lastrowid

    def execute_many(self, sql: str, params_list: List[tuple]) -> int:
        """执行批量操作"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            tsql = self._prep(sql, params_list[0] if params_list else ())
            cursor.executemany(tsql, params_list)
            conn.commit()
            return cursor.rowcount

    # --------------------------------------------------------
    # 表/列内省
    # --------------------------------------------------------

    def table_exists(self, table_name: str) -> bool:
        """检查表是否存在"""
        if self.db_type == 'mysql':
            sql = ("SELECT table_name FROM information_schema.tables "
                   "WHERE table_schema=? AND table_name=?")
            result = self.execute_query(sql, (self.mysql_database, table_name))
            return len(result) > 0
        sql = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        result = self.execute_query(sql, (table_name,))
        return len(result) > 0

    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """获取表的列信息（统一结构）"""
        if not self.table_exists(table_name):
            return []

        if self.db_type == 'mysql':
            sql = ("SELECT column_name, column_type, is_nullable, column_default, "
                   "column_key, ordinal_position "
                   "FROM information_schema.columns "
                   "WHERE table_schema=? AND table_name=? "
                   "ORDER BY ordinal_position")
            result = self.execute_query(sql, (self.mysql_database, table_name))
            columns = []
            for row in result:
                columns.append({
                    'cid': row[5],
                    'name': row[0],
                    'type': row[1],
                    'notnull': (str(row[2]).upper() == 'NO'),
                    'default_value': row[3],
                    'pk': (str(row[4]).upper() == 'PRI'),
                })
            return columns

        sql = f"PRAGMA table_info([{table_name}])"
        result = self.execute_query(sql)
        columns = []
        for row in result:
            columns.append({
                'cid': row[0],
                'name': row[1],
                'type': row[2],
                'notnull': bool(row[3]),
                'default_value': row[4],
                'pk': bool(row[5])
            })
        return columns

    def get_all_tables(self) -> List[str]:
        """获取数据库中所有表的名称列表"""
        if self.db_type == 'mysql':
            sql = ("SELECT table_name FROM information_schema.tables "
                   "WHERE table_schema=? AND table_type='BASE TABLE' "
                   "ORDER BY table_name")
            tables = self.execute_query(sql, (self.mysql_database,))
            return [t[0] for t in tables]
        sql = ("SELECT name FROM sqlite_master WHERE type='table' "
               "AND name NOT LIKE 'sqlite_%' ORDER BY name")
        tables = self.execute_query(sql)
        return [table[0] for table in tables]

    # --------------------------------------------------------
    # 建表（区分两个函数：use_sqlite / use_mysql）
    # --------------------------------------------------------

    def create_table(self, table_name: str, columns: List[Dict[str, Any]],
                     indexes: List[Dict[str, Any]] = None) -> bool:
        """创建表 - 按当前后端分派到 use_sqlite / use_mysql"""
        try:
            if self.db_type == 'mysql':
                return self.use_mysql(table_name, columns, indexes)
            return self.use_sqlite(table_name, columns, indexes)
        except Exception as e:
            self.last_error = str(e)
            print(f"创建表 {table_name} 失败: {e}")
            return False

    def use_sqlite(self, table_name: str, columns: List[Dict[str, Any]],
                   indexes: List[Dict[str, Any]] = None) -> bool:
        """使用 SQLite 方言创建表"""
        column_defs = []
        primary_keys = []

        for col in columns:
            if col.get('primary_key'):
                primary_keys.append(f'[{col["name"]}]')

        for col in columns:
            col_name = f'[{col["name"]}]'
            col_def = f"{col_name} {col['type']}"

            if col.get('primary_key') and len(primary_keys) == 1:
                col_def += " PRIMARY KEY"
            if col.get('not_null'):
                col_def += " NOT NULL"
            if col.get('default') is not None:
                col_def += f" DEFAULT {col['default']}"
            column_defs.append(col_def)

        if len(primary_keys) > 1:
            column_defs.append(f"PRIMARY KEY ({', '.join(primary_keys)})")

        sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(column_defs)})"
        self.execute_update(sql)

        if indexes:
            for idx in indexes:
                idx_name = idx.get('name', f"idx_{table_name}_{idx['columns'][0]}")
                idx_cols = ', '.join([f'[{col}]' for col in idx['columns']])
                idx_sql = (f"CREATE INDEX IF NOT EXISTS {idx_name} "
                           f"ON {table_name} ({idx_cols})")
                self.execute_update(idx_sql)
        return True

    def use_mysql(self, table_name: str, columns: List[Dict[str, Any]],
                  indexes: List[Dict[str, Any]] = None) -> bool:
        """使用 MySQL 方言创建表（合理的字段类型 + 复合索引前缀）"""
        pk_cols = [c['name'] for c in columns if c.get('primary_key')]
        indexed_names = set(pk_cols)
        for idx in (indexes or []):
            indexed_names.update(idx['columns'])

        # 计算每列映射后的 MySQL 类型（供建表 + 索引前缀使用）
        type_map = {}
        for col in columns:
            type_map[col['name']] = _mysql_column_type(col, col['name'] in indexed_names)

        column_defs = []
        for col in columns:
            name = col['name']
            mysql_type = type_map[name]
            col_def = f"`{name}` {mysql_type}"
            if col.get('not_null') or col.get('primary_key'):
                col_def += " NOT NULL"
            if col.get('autoincrement') and col.get('primary_key') and len(pk_cols) == 1:
                col_def += " AUTO_INCREMENT"
            default = col.get('default')
            if default is not None and _mysql_type_allows_default(mysql_type):
                col_def += f" DEFAULT {self._mysql_default(default)}"
            column_defs.append(col_def)

        if pk_cols:
            pk_list = ', '.join(f'`{c}`' for c in pk_cols)
            column_defs.append(f"PRIMARY KEY ({pk_list})")

        sql = (f"CREATE TABLE IF NOT EXISTS `{table_name}` "
               f"({', '.join(column_defs)}) ENGINE=InnoDB "
               f"DEFAULT CHARSET=utf8mb4 COLLATE={self.mysql_collation()}")
        self.execute_update(sql)

        # 创建索引（MySQL 不支持 CREATE INDEX IF NOT EXISTS，重复时忽略）
        if indexes:
            for idx in indexes:
                idx_name = idx.get('name', f"idx_{table_name}_{idx['columns'][0]}")
                parts = []
                for col in idx['columns']:
                    ctype = type_map.get(col, 'VARCHAR(255)').upper()
                    if any(t in ctype for t in _MYSQL_TEXTLIKE):
                        parts.append(f"`{col}`({_MYSQL_INDEX_PREFIX})")
                    else:
                        parts.append(f"`{col}`")
                idx_sql = (f"CREATE INDEX `{idx_name}` "
                           f"ON `{table_name}` ({', '.join(parts)})")
                try:
                    self.execute_update(idx_sql)
                except Exception as e:
                    # 1061: 索引已存在
                    if '1061' not in str(e) and 'Duplicate key name' not in str(e):
                        print(f"创建索引 {idx_name} 失败: {e}")
        return True

    @staticmethod
    def _mysql_default(default) -> str:
        """
        格式化 MySQL 默认值。
        模型里的默认值是「原始 SQL 字面量片段」（SQLite 分支直接拼接使用），
        已经带引号的片段（如 "'rename'"）原样保留，否则补引号。
        """
        if isinstance(default, (int, float)):
            return str(default)
        s = str(default)
        if len(s) >= 2 and s.startswith("'") and s.endswith("'"):
            return s
        return "'" + s.replace("'", "''") + "'"

    # --------------------------------------------------------
    # 列变更
    # --------------------------------------------------------

    def add_column(self, table_name: str, column_def: Dict[str, Any]) -> bool:
        """添加列到现有表"""
        try:
            if self.db_type == 'mysql':
                mysql_type = _mysql_column_type(column_def, False)
                col_sql = f"`{column_def['name']}` {mysql_type}"
                if column_def.get('not_null'):
                    col_sql += " NOT NULL"
                if (column_def.get('default') is not None
                        and _mysql_type_allows_default(mysql_type)):
                    col_sql += f" DEFAULT {self._mysql_default(column_def['default'])}"
                sql = f"ALTER TABLE `{table_name}` ADD COLUMN {col_sql}"
                self.execute_update(sql)
                return True

            col_sql = f"[{column_def['name']}] {column_def['type']}"
            if column_def.get('not_null'):
                col_sql += " NOT NULL"
            if column_def.get('default') is not None:
                col_sql += f" DEFAULT {column_def['default']}"
            sql = f"ALTER TABLE {table_name} ADD COLUMN {col_sql}"
            self.execute_update(sql)
            return True
        except Exception as e:
            self.last_error = str(e)
            print(f"添加列到表 {table_name} 失败: {e}")
            return False

    def drop_column(self, table_name: str, column_name: str) -> bool:
        """删除表中的列"""
        try:
            if self.db_type == 'mysql':
                sql = f"ALTER TABLE `{table_name}` DROP COLUMN `{column_name}`"
                self.execute_update(sql)
                return True

            # SQLite 3.35.0+ 支持 ALTER TABLE DROP COLUMN
            version_info = self.execute_query("SELECT sqlite_version()")
            version = version_info[0][0] if version_info else "0.0.0"
            version_parts = [int(x) for x in version.split('.')]

            if version_parts[0] > 3 or (version_parts[0] == 3 and version_parts[1] >= 35):
                sql = f"ALTER TABLE [{table_name}] DROP COLUMN [{column_name}]"
                self.execute_update(sql)
                return True
            else:
                return self._drop_column_recreate_table(table_name, column_name)
        except Exception as e:
            self.last_error = str(e)
            print(f"删除列 {column_name} 从表 {table_name} 失败: {e}")
            return False

    def _drop_column_recreate_table(self, table_name: str, column_name: str) -> bool:
        """通过重建表来删除列（用于旧版 SQLite）"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                columns = self.get_table_columns(table_name)
                if not any(col['name'] == column_name for col in columns):
                    return True

                keep_columns = [col for col in columns if col['name'] != column_name]
                if not keep_columns:
                    raise ValueError(f"无法删除列 {column_name}，因为它是表中的唯一列")

                keep_column_names = [f"[{col['name']}]" for col in keep_columns]
                keep_column_names_str = ", ".join(keep_column_names)

                temp_table_name = f"{table_name}_temp_{abs(hash(column_name)) % 1000000}"

                create_temp_sql = f"CREATE TABLE [{temp_table_name}] ("
                column_defs = []
                primary_keys = []

                for col in keep_columns:
                    col_name = f"[{col['name']}]"
                    col_def = f"{col_name} {col['type']}"

                    if col.get('pk'):
                        if len([c for c in keep_columns if c.get('pk')]) == 1:
                            col_def += " PRIMARY KEY"
                        else:
                            primary_keys.append(col_name)

                    if col.get('notnull') and not col.get('pk'):
                        col_def += " NOT NULL"

                    if col.get('default_value') is not None:
                        col_def += f" DEFAULT {col['default_value']}"

                    column_defs.append(col_def)

                create_temp_sql += ", ".join(column_defs)
                if len(primary_keys) > 1:
                    create_temp_sql += f", PRIMARY KEY ({', '.join(primary_keys)})"
                create_temp_sql += ")"

                cursor.execute(create_temp_sql)
                cursor.execute(
                    f"INSERT INTO [{temp_table_name}] ({keep_column_names_str}) "
                    f"SELECT {keep_column_names_str} FROM [{table_name}]")
                cursor.execute(f"DROP TABLE [{table_name}]")
                cursor.execute(f"ALTER TABLE [{temp_table_name}] RENAME TO [{table_name}]")

                conn.commit()
                return True
        except Exception as e:
            print(f"通过重建表删除列 {column_name} 从表 {table_name} 失败: {e}")
            return False

    def drop_table(self, table_name: str) -> bool:
        """删除表"""
        try:
            if self.db_type == 'mysql':
                self.execute_update(f"DROP TABLE IF EXISTS `{table_name}`")
            else:
                self.execute_update(f"DROP TABLE IF EXISTS [{table_name}]")
            return True
        except Exception as e:
            print(f"删除表 {table_name} 失败: {e}")
            return False

    def get_database_info(self) -> Dict[str, Any]:
        """获取数据库信息"""
        info = {
            'db_type': self.db_type,
            'db_path': self.db_path if self.db_type == 'sqlite' else self.mysql_database,
            'tables': []
        }
        for table_name in self.get_all_tables():
            columns = self.get_table_columns(table_name)
            info['tables'].append({
                'name': table_name,
                'columns': columns
            })
        return info
