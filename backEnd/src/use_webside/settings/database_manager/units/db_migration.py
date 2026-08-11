# -*- coding: utf-8 -*-
"""
数据库后端配置与迁移

提供：
- 读取/保存数据库后端配置（SQLite / MySQL，连接参数保存在基础 SQLite 的 config 表）
- 测试 MySQL 连接（连通性 + 目标库 + 迁移实际需要的权限）
- 迁移到 MySQL（SQLite -> MySQL）
- 迁移到 SQLite（MySQL -> SQLite）

迁移思路：
- 用「源后端」的独立原始连接分批读取每张表的数据（不整表载入内存）
- 把单例 DatabaseManager 临时指向「目标后端」，用模型重建表结构后写入数据
- 全部成功后，再把 db_type 持久化到引导配置（基础 SQLite 的 config 表）
"""
import os
import time
from contextlib import contextmanager

from flask import request, jsonify
from src.units.log import Log
from src.db_manager.database import (
    DatabaseManager, read_bootstrap_db_config, write_bootstrap_db_config,
)
from src.db_manager.manager import get_db_manager
from src.db_manager.migration_gate import migration_gate

_BATCH = 2000

# 迁移时的锁等待上限（秒）。MySQL 的 lock_wait_timeout 默认是 31536000 秒（一年），
# 一旦目标表被别的会话（例如数据库客户端里未提交的事务）占住，迁移会无限期挂起。
_LOCK_WAIT_TIMEOUT = 60

# 开始迁移前，等待正在执行的后台任务结束的上限（秒）
_TASK_DRAIN_TIMEOUT = 20

# 权限实测使用的临时表名
_PRIV_TABLE = '__cswm_privilege_check'

# 迁移到 MySQL 后，本地 SQLite 中需要保留的表
# config 表存放数据库引导配置（决定启动时连哪个后端），必须保留
_SQLITE_KEEP_TABLES = ('config',)


class MysqlCheckError(Exception):
    """MySQL 连接/权限检查失败（消息已中文化，可直接展示给用户）"""


def _mysql_connect(cfg, with_database=True):
    """建立 MySQL 连接"""
    import pymysql
    kwargs = dict(
        host=cfg.get('host', ''),
        port=int(cfg.get('port') or 3306),
        user=cfg.get('user', ''),
        password=cfg.get('password', ''),
        charset='utf8mb4',
        autocommit=True,
        connect_timeout=10,
        sql_mode='NO_ENGINE_SUBSTITUTION',
    )
    if with_database and cfg.get('database'):
        kwargs['database'] = cfg['database']
    return pymysql.connect(**kwargs)


def _friendly_mysql_error(e, cfg):
    """把 pymysql 的原始错误翻译成可操作的中文提示"""
    args = getattr(e, 'args', None) or ()
    code = args[0] if args and isinstance(args[0], int) else None
    raw = str(e)
    user = cfg.get('user', '')
    database = cfg.get('database', '')
    addr = f"{cfg.get('host', '')}:{int(cfg.get('port') or 3306)}"

    if code == 1045:
        pwd_note = '本次使用的是空密码' if not cfg.get('password') else '本次已发送密码'
        return (
            f"MySQL 拒绝了账号验证（{raw}）。\n"
            f"提示：错误里 @ 后面的主机名是 MySQL 反查到的「客户端来源主机」，不是服务器地址；"
            f"{pwd_note}。\n"
            f"请在 MySQL 服务器上确认账号允许的来源主机：\n"
            f"    SELECT user, host, plugin FROM mysql.user WHERE user = '{user}';\n"
            f"若来源主机不匹配或密码不对，可重新授权：\n"
            f"    CREATE USER '{user}'@'%' IDENTIFIED BY '你的密码';\n"
            f"    GRANT ALL PRIVILEGES ON `{database}`.* TO '{user}'@'%';\n"
            f"    GRANT CREATE ON *.* TO '{user}'@'%';   -- 首次迁移需要自动建库\n"
            f"    FLUSH PRIVILEGES;")
    if code == 1044:
        return (f"账号 {user} 没有数据库 {database} 的访问权限（{raw}）。\n"
                f"请执行：GRANT ALL PRIVILEGES ON `{database}`.* TO '{user}'@'来源主机'; FLUSH PRIVILEGES;")
    if code == 1049:
        return (f"数据库 {database} 不存在（{raw}）。\n"
                f"请先手动创建，或给账号授予 CREATE 权限以便迁移时自动建库。")
    if code == 1205:
        return (f"等待表锁超时（{raw}）。\n"
                f"迁移需要独占地清空目标表，通常是有别的会话占着 {database} 里的表——"
                f"最常见的是数据库客户端（Navicat/DBeaver 等）打开了这些表或留着未提交的事务。\n"
                f"可在 MySQL 中执行 SHOW PROCESSLIST 找出占用的连接并 KILL，"
                f"或先关掉数据库客户端再重试迁移。")
    if code == 1130:
        return (f"MySQL 不允许当前主机连接（{raw}）。\n"
                f"请检查账号的 host 限制，以及服务器 bind-address 是否允许远程连接。")
    if code in (2002, 2003, 2005):
        return (f"无法连接到 {addr}（{raw}）。\n"
                f"请检查地址与端口、MySQL 是否已启动、防火墙以及 bind-address 配置。")
    if code == 1251 or 'authentication plugin' in raw.lower():
        return (f"认证插件不兼容（{raw}）。\n"
                f"请确认账号使用 caching_sha2_password 或 mysql_native_password，"
                f"并已安装 cryptography 依赖。")
    return f"连接失败：{raw}"


def _probe_privileges(cursor, cfg):
    """
    用一张临时表实测迁移真正需要的权限（建表/写入/清空/建索引/删表）。
    权限不足时抛 MysqlCheckError。
    """
    database = cfg['database']
    try:
        cursor.execute(f"DROP TABLE IF EXISTS `{database}`.`{_PRIV_TABLE}`")
        cursor.execute(f"CREATE TABLE `{database}`.`{_PRIV_TABLE}` "
                       f"(id BIGINT PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")
        cursor.execute(f"INSERT INTO `{database}`.`{_PRIV_TABLE}` (id) VALUES (1)")
        cursor.execute(f"SELECT id FROM `{database}`.`{_PRIV_TABLE}`")
        cursor.fetchall()
        cursor.execute(f"TRUNCATE TABLE `{database}`.`{_PRIV_TABLE}`")
    except Exception as e:
        raise MysqlCheckError(
            f"账号 {cfg.get('user')} 对数据库 {database} 的权限不足：\n"
            f"{_friendly_mysql_error(e, cfg)}\n"
            f"迁移需要 SELECT / INSERT / DELETE / CREATE / DROP / INDEX / ALTER 权限。")
    finally:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS `{database}`.`{_PRIV_TABLE}`")
        except Exception:
            pass


def _check_mysql_ready(cfg, create_db=False):
    """
    迁移/测试前的连通性与权限检查。
    create_db=True 时目标库不存在会自动创建（迁移使用）。
    返回信息 dict；检查失败抛 MysqlCheckError。
    """
    missing = [label for label, key in (('主机地址', 'host'), ('用户名', 'user'), ('数据库名', 'database'))
               if not str(cfg.get(key) or '').strip()]
    if missing:
        raise MysqlCheckError('请填写：' + '、'.join(missing))

    try:
        # 先用「不指定数据库」的方式连接，把账号问题和库/权限问题区分开
        conn = _mysql_connect(cfg, with_database=False)
    except Exception as e:
        raise MysqlCheckError(_friendly_mysql_error(e, cfg))

    database = cfg['database']
    info = {'database_created': False, 'table_count': 0}
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION(), CURRENT_USER()")
        info['version'], info['current_user'] = cursor.fetchone()

        cursor.execute("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA "
                       "WHERE SCHEMA_NAME=%s", (database,))
        info['database_exists'] = cursor.fetchone() is not None

        if not info['database_exists'] and create_db:
            # 排序规则必须与 SQLite 一致（区分大小写），否则仅大小写不同的主键会冲突
            cursor.execute("SELECT COLLATION_NAME FROM information_schema.COLLATIONS "
                           "WHERE COLLATION_NAME='utf8mb4_0900_bin'")
            collation = 'utf8mb4_0900_bin' if cursor.fetchone() else 'utf8mb4_bin'
            try:
                cursor.execute(f"CREATE DATABASE `{database}` "
                               f"CHARACTER SET utf8mb4 COLLATE {collation}")
            except Exception as e:
                raise MysqlCheckError(f"创建数据库 {database} 失败：\n{_friendly_mysql_error(e, cfg)}")
            info['database_exists'] = True
            info['database_created'] = True

        if info['database_exists']:
            cursor.execute("SELECT COUNT(*) FROM information_schema.TABLES "
                           "WHERE TABLE_SCHEMA=%s AND TABLE_TYPE='BASE TABLE'", (database,))
            info['table_count'] = cursor.fetchone()[0]
            _probe_privileges(cursor, cfg)
            info['privileges_ok'] = True
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return info


def _find_pk_conflicts(src_conn, models):
    """
    找出在 MySQL 主键语义下会冲突的表。

    SQLite 的主键列允许 NULL 且 NULL != NULL，同一个键可以有多行；
    MySQL 的主键列隐式 NOT NULL，NULL 会落成空串，这些行就撞车了。
    返回 {表名: {'keys': 主键列, 'groups': 冲突组数, 'dropped': 将丢弃的行数}}
    """
    conflicts = {}
    cursor = src_conn.cursor()
    for model in models:
        table_name = model.get_table_name()
        pk = [n for n, d in model.get_fields().items() if d.get('primary_key')]
        if not pk:
            continue
        try:
            cursor.execute(f"PRAGMA table_info([{table_name}])")
            existing = {r[1] for r in cursor.fetchall()}
            pk = [p for p in pk if p in existing]
            if not pk:
                continue
            group = ', '.join(f"IFNULL([{p}],'')" for p in pk)
            cursor.execute(
                f"SELECT COUNT(*), IFNULL(SUM(n), 0) FROM "
                f"(SELECT {group}, COUNT(*) n FROM [{table_name}] GROUP BY {group} HAVING n > 1)")
            groups, rows = cursor.fetchone()
        except Exception as e:
            Log().write_log(f"检查表 {table_name} 主键冲突失败: {e}", 'ERROR')
            continue
        if groups:
            conflicts[table_name] = {
                'keys': pk, 'groups': groups, 'dropped': rows - groups,
            }
    return conflicts


def _source_table_exists(src_type, src_conn, table_name):
    """源后端中是否存在该表（这里用的是原始连接，占位符按各自方言书写）"""
    cursor = src_conn.cursor()
    try:
        if src_type == 'mysql':
            cursor.execute("SELECT COUNT(*) FROM information_schema.TABLES "
                           "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s", (table_name,))
        else:
            cursor.execute("SELECT COUNT(*) FROM sqlite_master "
                           "WHERE type='table' AND name=?", (table_name,))
        return cursor.fetchone()[0] > 0
    finally:
        try:
            cursor.close()
        except Exception:
            pass


def _clear_target_table(dm, table_name):
    """清空目标表，避免主键冲突"""
    if dm.db_type == 'mysql':
        dm.execute_update(f"TRUNCATE TABLE `{table_name}`")
    else:
        dm.execute_update(f"DELETE FROM [{table_name}]")


def _copy_table(dm, src_type, src_conn, table_name, target_columns, dedup_keys=None):
    """
    从源后端流式读取一张表并写入目标后端（dm 已指向目标），返回复制的行数。
    仅复制模型定义且源表中存在的列，按模型字段顺序。

    dedup_keys 非空时，源表的主键在 MySQL 语义下有重复：按该主键分组，
    每组只取 rowid 最大的一行（即最后写入、状态最新的那条）。
    """
    # 模型已定义但源库中还没建过的表（如新增模型），按空表处理
    if not _source_table_exists(src_type, src_conn, table_name):
        Log().write_log(f"源库中不存在表 {table_name}，按空表迁移", 'INFO')
        _clear_target_table(dm, table_name)
        return 0

    if src_type == 'mysql':
        # SSCursor：逐行从服务端取数，避免整表载入内存
        from pymysql.cursors import SSCursor
        cursor = src_conn.cursor(SSCursor)
        select_sql = f"SELECT * FROM `{table_name}`"
    else:
        cursor = src_conn.cursor()
        if dedup_keys:
            group = ', '.join(f"IFNULL([{k}],'')" for k in dedup_keys)
            select_sql = (f"SELECT * FROM [{table_name}] WHERE rowid IN "
                          f"(SELECT MAX(rowid) FROM [{table_name}] GROUP BY {group})")
        else:
            select_sql = f"SELECT * FROM [{table_name}]"

    try:
        cursor.execute(select_sql)
        src_cols = [d[0] for d in cursor.description] if cursor.description else []
        src_index = {name: i for i, name in enumerate(src_cols)}
        use_cols = [c for c in target_columns if c in src_index]
        if not use_cols:
            return 0
        picks = [src_index[c] for c in use_cols]

        _clear_target_table(dm, table_name)

        col_sql = ', '.join(f"[{c}]" for c in use_cols)
        placeholders = ', '.join(['?'] * len(use_cols))
        sql = f"INSERT INTO [{table_name}] ({col_sql}) VALUES ({placeholders})"

        total = 0
        while True:
            chunk = cursor.fetchmany(_BATCH)
            if not chunk:
                break
            dm.execute_many(sql, [tuple(row[i] for i in picks) for row in chunk])
            total += len(chunk)
        return total
    finally:
        try:
            cursor.close()
        except Exception:
            pass


@contextmanager
def _maintenance_mode(note):
    """
    迁移期间的维护模式：
    1. 暂停后台任务调度器，并等待正在执行的任务跑完（超时则放弃迁移，不强行打断）
    2. 持有迁移闸门，此后其他线程的数据库操作一律被拒绝，API 统一返回 503
    退出时无论成功失败都恢复调度器。
    """
    try:
        from src.units.auto_process.task_scheduler import get_scheduler
        scheduler = get_scheduler()
    except Exception as e:
        Log().write_log(f"获取任务调度器失败，跳过暂停: {e}", 'ERROR')
        scheduler = None

    if scheduler is not None:
        scheduler.pause()
        print('[迁移] 已暂停后台任务调度器', flush=True)
    try:
        if scheduler is not None:
            deadline = time.time() + _TASK_DRAIN_TIMEOUT
            busy = scheduler.get_currently_executing_tasks()
            while busy and time.time() < deadline:
                print(f"[迁移] 等待 {len(busy)} 个后台任务结束 ...", flush=True)
                time.sleep(1)
                busy = scheduler.get_currently_executing_tasks()
            if busy:
                names = '、'.join(t.get('taskName', '?') for t in busy)
                raise RuntimeError(
                    f'以下后台任务仍在执行，已等待 {_TASK_DRAIN_TIMEOUT} 秒仍未结束：{names}。'
                    f'为避免迁移过程中数据被写乱，本次迁移未开始，请等任务结束后重试。')

        with migration_gate.hold(note):
            print(f'[迁移] 进入维护模式：{note}', flush=True)
            yield
    finally:
        if scheduler is not None:
            scheduler.resume()
            print('[迁移] 已恢复后台任务调度器', flush=True)


def _verify_target_rows(dm, stats):
    """
    核对目标库每张表的行数与本次复制的行数是否一致。
    返回不一致的表描述列表（为空表示全部一致）。
    """
    mismatched = []
    for table_name, copied in stats.items():
        if not isinstance(copied, int):
            continue
        try:
            result = dm.execute_query(f"SELECT COUNT(*) FROM [{table_name}]")
            actual = result[0][0] if result else 0
        except Exception as e:
            mismatched.append(f"{table_name}(校验失败: {e})")
            continue
        if actual != copied:
            mismatched.append(f"{table_name}(已复制 {copied} 行，目标库 {actual} 行)")
    return mismatched


def _purge_local_sqlite(db_path):
    """
    迁移到 MySQL 成功后清空本地 SQLite：只保留 config 表（数据库引导配置所在），
    其余表的数据全部删除，并回收磁盘空间。
    返回 (被清空的表名列表, 释放前后的文件大小)。
    """
    import sqlite3
    size_before = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    conn = sqlite3.connect(db_path, timeout=60.0)
    cleared = []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' "
                       "AND name NOT LIKE 'sqlite_%'")
        for (name,) in cursor.fetchall():
            if name in _SQLITE_KEEP_TABLES:
                continue
            cursor.execute(f"DELETE FROM [{name}]")
            cleared.append(name)
        conn.commit()
    finally:
        conn.close()

    # VACUUM 不能在事务内执行，单独用自动提交连接回收空间；失败不影响清空结果
    try:
        conn = sqlite3.connect(db_path, timeout=60.0, isolation_level=None)
        try:
            conn.execute('VACUUM')
        finally:
            conn.close()
    except Exception as e:
        Log().write_log(f"清空本地 SQLite 后 VACUUM 失败（数据已删除，仅未回收空间）: {e}", 'ERROR')

    size_after = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    return cleared, size_before, size_after


def _format_size(num_bytes):
    """字节数格式化为可读文本"""
    if num_bytes >= 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.1f} MB"
    if num_bytes >= 1024:
        return f"{num_bytes / 1024:.1f} KB"
    return f"{num_bytes} B"


def _do_migration(source_type, target_type, target_mysql_cfg):
    """
    执行迁移，返回 (success, message, stats)。

    整个过程处于维护模式：后台调度器被暂停并等待任务跑完，
    其他线程的数据库操作会被闸门拒绝，API 层统一返回 503。
    """
    try:
        with _maintenance_mode(f'{source_type} → {target_type}'):
            return _run_migration(source_type, target_type, target_mysql_cfg)
    except Exception as e:
        Log().write_log(f"数据库迁移未开始: {e}", 'ERROR')
        return False, f'迁移失败: {e}', {}


def _run_migration(source_type, target_type, target_mysql_cfg):
    """迁移主体（已处于维护模式内）。调用前应已完成目标库的连通性/权限检查"""
    dm = DatabaseManager()
    # 记录原始后端，便于失败回滚
    orig_type = dm.db_type
    orig_mysql_cfg = dict(dm.mysql_config)

    # 准备源连接（在切换单例之前用原始连接读取）
    if source_type == 'mysql':
        src_conn = _mysql_connect(orig_mysql_cfg, with_database=True)
    else:
        import sqlite3
        src_conn = sqlite3.connect(dm.db_path, timeout=60.0)

    stats = {}
    failed = []
    try:
        # 把单例指向目标后端
        dm.apply_backend(target_type, target_mysql_cfg if target_type == 'mysql' else None)
        # apply_backend 连接失败时会静默回退到 SQLite，必须显式确认，否则会误写回源库
        if dm.db_type != target_type:
            raise RuntimeError('无法连接到目标数据库，已中止迁移（源数据未改动）')

        if target_type == 'mysql':
            # 缩短锁等待，避免被别的会话的元数据锁无限期挂住（默认是一年）
            for var in ('lock_wait_timeout', 'innodb_lock_wait_timeout'):
                try:
                    dm.execute_update(f"SET SESSION {var} = {_LOCK_WAIT_TIMEOUT}")
                except Exception as e:
                    print(f"[迁移] 设置 {var} 失败（继续执行）: {e}", flush=True)

        models = get_db_manager().models

        if target_type == 'mysql':
            # 目标库中的同名表本来就会被整体覆盖，这里先删表再按当前模型重建，
            # 保证表结构和排序规则始终与模型定义一致，不残留历史遗留的旧结构
            print(f"[迁移] 清理目标库中的 {len(models)} 张旧表", flush=True)
            for model in models:
                dm.execute_update(f"DROP TABLE IF EXISTS `{model.get_table_name()}`")

        # 在目标后端按模型重建所有表结构
        print(f"[迁移] 开始在目标库创建 {len(models)} 张表结构", flush=True)
        for model in models:
            # ensure_table_exists 只返回 bool，真实原因记在 dm.last_error 上
            dm.last_error = ''
            if not model.ensure_table_exists():
                detail = dm.last_error or '未知原因，请查看后端控制台输出'
                raise RuntimeError(
                    f'在目标数据库创建表 {model.get_table_name()} 失败：{detail}')

        # 迁往 MySQL 时，先找出主键在 MySQL 语义下会冲突的表
        conflicts = {}
        if source_type == 'sqlite' and target_type == 'mysql':
            conflicts = _find_pk_conflicts(src_conn, models)
            for name, info in conflicts.items():
                print(f"[迁移] {name}: 主键 {info['keys']} 有 {info['groups']} 组重复，"
                      f"每组只保留 rowid 最大（状态最新）的一行，丢弃 {info['dropped']} 行",
                      flush=True)
                Log().write_log(
                    f"迁移去重: {name} 主键重复 {info['groups']} 组，丢弃 {info['dropped']} 行", 'ERROR')

        # 逐表复制数据（日志级别通常是 error，进度直接打到控制台）
        total = len(models)
        for seq, model in enumerate(models, 1):
            table_name = model.get_table_name()
            target_columns = list(model.get_fields().keys())
            print(f"[迁移] ({seq}/{total}) {table_name} ...", flush=True)
            try:
                copied = _copy_table(
                    dm, source_type, src_conn, table_name, target_columns,
                    dedup_keys=conflicts.get(table_name, {}).get('keys'))
                stats[table_name] = copied
                print(f"[迁移] ({seq}/{total}) {table_name} 完成，{copied} 行", flush=True)
            except Exception as e:
                Log().write_log(f"迁移表 {table_name} 失败: {e}", 'ERROR')
                print(f"[迁移] ({seq}/{total}) {table_name} 失败: {e}", flush=True)
                stats[table_name] = f"失败: {e}"
                failed.append(table_name)

        if failed:
            raise RuntimeError(
                '以下表迁移失败：' + '、'.join(failed) +
                '；源数据库保持不变，目标库中的数据不完整')

        # 持久化引导配置（目标后端成为默认）
        if target_type == 'mysql':
            write_bootstrap_db_config({
                'db_type': 'mysql',
                'mysql_host': target_mysql_cfg.get('host', ''),
                'mysql_port': str(target_mysql_cfg.get('port') or 3306),
                'mysql_user': target_mysql_cfg.get('user', ''),
                'mysql_password': target_mysql_cfg.get('password', ''),
                'mysql_database': target_mysql_cfg.get('database', ''),
            })
        else:
            write_bootstrap_db_config({'db_type': 'sqlite'})

        # 重新按引导配置加载（确保单例与持久化一致）
        dm.reconfigure()
        total_rows = sum(v for v in stats.values() if isinstance(v, int))
        message = f'迁移完成：{len(stats)} 张表，共 {total_rows} 行'
        if conflicts:
            dropped = sum(c['dropped'] for c in conflicts.values())
            detail = '、'.join(f"{n} {c['dropped']} 行" for n, c in conflicts.items())
            message += (f'\n主键去重：因 MySQL 主键不允许 NULL/重复，'
                        f'共丢弃 {dropped} 行（{detail}），每组保留状态最新的一行')

        # 迁移到 MySQL 后清空本地 SQLite，只保留 config 表中的引导配置。
        # 属于不可逆操作，先核对目标库行数，不一致就跳过清理。
        if source_type == 'sqlite' and target_type == 'mysql':
            if dm.db_type != 'mysql':
                # reconfigure 后没连上 MySQL 时，dm 已回退到 SQLite，校验会读到源库，必须跳过
                Log().write_log("迁移后重新加载配置未连上 MySQL，跳过清空本地 SQLite", 'ERROR')
                message += ('\n注意：数据已写入 MySQL，但重新加载配置后未能连上 MySQL，'
                            '已跳过清空本地 SQLite，请检查连接参数。')
                return True, message, stats

            mismatched = _verify_target_rows(dm, stats)
            if mismatched:
                Log().write_log(f"目标库行数校验不一致，跳过清空本地 SQLite: {mismatched}", 'ERROR')
                message += ('\n注意：目标库行数校验不一致，已跳过清空本地 SQLite（本地数据完整保留）：'
                            + '、'.join(mismatched))
            else:
                # 清理失败不影响已完成的迁移，单独兜底
                try:
                    cleared, size_before, size_after = _purge_local_sqlite(dm.db_path)
                    Log().write_log(
                        f"迁移到 MySQL 后已清空本地 SQLite {len(cleared)} 张表，"
                        f"文件 {_format_size(size_before)} -> {_format_size(size_after)}", 'INFO')
                    message += (f'\n本地 SQLite 已清空 {len(cleared)} 张表（保留 config 配置表），'
                                f'文件 {_format_size(size_before)} → {_format_size(size_after)}')
                except Exception as e:
                    Log().write_log(f"清空本地 SQLite 失败: {e}", 'ERROR')
                    message += f'\n注意：迁移已成功，但清空本地 SQLite 失败：{e}'

        return True, message, stats

    except Exception as e:
        Log().write_log(f"数据库迁移失败: {e}", 'ERROR')
        # 回滚到原始后端
        try:
            dm.apply_backend(orig_type, orig_mysql_cfg if orig_type == 'mysql' else None)
        except Exception:
            pass
        return False, f'迁移失败: {e}', stats
    finally:
        try:
            src_conn.close()
        except Exception:
            pass


def _mysql_cfg_from_request(data):
    """从请求体取 MySQL 连接参数，密码为空时回退到已保存的密码"""
    cfg = {
        'host': (data.get('host') or '').strip(),
        'port': data.get('port', 3306),
        'user': (data.get('user') or '').strip(),
        'password': data.get('password', ''),
        'database': (data.get('database') or '').strip(),
    }
    if not cfg['password']:
        saved = read_bootstrap_db_config()
        cfg['password'] = saved.get('mysql_password', '')
    return cfg


class DatabaseMigration:
    """数据库后端配置与迁移 API"""

    @staticmethod
    def get_db_config():
        """获取当前数据库后端配置"""
        try:
            cfg = read_bootstrap_db_config()
            return jsonify({
                'db_type': cfg.get('db_type', 'sqlite'),
                'mysql': {
                    'host': cfg.get('mysql_host', ''),
                    'port': cfg.get('mysql_port', '3306'),
                    'user': cfg.get('mysql_user', ''),
                    # 出于安全不回传密码明文，仅标识是否已设置
                    'password': '',
                    'has_password': bool(cfg.get('mysql_password')),
                    'database': cfg.get('mysql_database', ''),
                },
                'active': DatabaseManager().db_type,
                # 迁移期间前端靠它显示维护状态（本接口直连基础 SQLite，不受闸门影响）
                'migrating': migration_gate.status(),
            })
        except Exception as e:
            Log().write_log(f"获取数据库配置失败: {e}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def save_db_config():
        """
        保存数据库后端配置并立即切换（不迁移数据）。
        body: { db_type, mysql: {host, port, user, password, database} }
        """
        try:
            data = request.json or {}
            db_type = data.get('db_type', 'sqlite')
            mysql = data.get('mysql', {}) or {}

            # 切换到 MySQL 前先检查连通性，避免静默回退到 SQLite
            if db_type == 'mysql':
                cfg = _mysql_cfg_from_request(mysql)
                try:
                    info = _check_mysql_ready(cfg, create_db=False)
                except MysqlCheckError as e:
                    return jsonify({'success': False, 'error': str(e)}), 400
                if not info.get('database_exists'):
                    return jsonify({
                        'success': False,
                        'error': f"数据库 {cfg['database']} 不存在。"
                                 f"「保存并切换」不会建库，请先使用「迁移到 MySQL」或手动创建该数据库。",
                    }), 400

            payload = {'db_type': db_type if db_type in ('sqlite', 'mysql') else 'sqlite'}
            if 'host' in mysql:
                payload['mysql_host'] = mysql.get('host', '')
            if 'port' in mysql:
                payload['mysql_port'] = str(mysql.get('port') or 3306)
            if 'user' in mysql:
                payload['mysql_user'] = mysql.get('user', '')
            # 仅当传入非空密码时才更新，避免空值覆盖已保存密码
            if mysql.get('password'):
                payload['mysql_password'] = mysql.get('password')
            if 'database' in mysql:
                payload['mysql_database'] = mysql.get('database', '')

            if not write_bootstrap_db_config(payload):
                return jsonify({'error': '保存配置失败'}), 500

            DatabaseManager().reconfigure()
            active = DatabaseManager().db_type
            if db_type == 'mysql' and active != 'mysql':
                return jsonify({
                    'success': False,
                    'error': 'MySQL 连接失败，已回退到 SQLite，请检查连接参数',
                    'active': active,
                }), 400

            Log().write_log(f"数据库后端已切换为: {active}", 'INFO')
            return jsonify({'success': True, 'active': active, 'message': f'已切换到 {active}'})
        except Exception as e:
            Log().write_log(f"保存数据库配置失败: {e}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def test_mysql_connection():
        """
        测试 MySQL 连接。body: {host, port, user, password, database}
        除连通性外，同时检查目标库是否存在以及迁移所需的权限。
        """
        try:
            cfg = _mysql_cfg_from_request(request.json or {})
            try:
                info = _check_mysql_ready(cfg, create_db=False)
            except MysqlCheckError as e:
                return jsonify({'success': False, 'error': str(e)}), 400

            details = [
                f"MySQL 版本 {info['version']}",
                f"实际匹配的账号 {info['current_user']}",
            ]
            if info.get('database_exists'):
                details.append(
                    f"数据库 {cfg['database']} 已存在（{info['table_count']} 张表），迁移所需权限检查通过")
            else:
                details.append(
                    f"数据库 {cfg['database']} 不存在，迁移时会自动创建（需要 CREATE 权限）")
            return jsonify({
                'success': True,
                'message': '连接成功\n' + '\n'.join(details),
                'info': info,
            })
        except Exception as e:
            Log().write_log(f"测试 MySQL 连接失败: {e}", 'ERROR')
            return jsonify({'success': False, 'error': str(e)}), 400

    @staticmethod
    def migrate_to_mysql():
        """迁移到 MySQL（SQLite -> MySQL）。body: {host, port, user, password, database}"""
        try:
            cfg = _mysql_cfg_from_request(request.json or {})

            if DatabaseManager().db_type == 'mysql':
                return jsonify({'error': '当前已经是 MySQL，无需迁移'}), 400

            # 先做完整检查（含自动建库），避免迁移中途才失败
            try:
                _check_mysql_ready(cfg, create_db=True)
            except MysqlCheckError as e:
                return jsonify({'success': False, 'message': f'迁移未开始: {e}'}), 400

            success, message, stats = _do_migration('sqlite', 'mysql', cfg)
            code = 200 if success else 500
            return jsonify({'success': success, 'message': message, 'stats': stats}), code
        except Exception as e:
            Log().write_log(f"迁移到 MySQL 失败: {e}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def migrate_to_sqlite():
        """迁移到 SQLite（MySQL -> SQLite）"""
        try:
            if DatabaseManager().db_type != 'mysql':
                return jsonify({'error': '当前不是 MySQL，无需迁移到 SQLite'}), 400

            success, message, stats = _do_migration('mysql', 'sqlite', None)
            code = 200 if success else 500
            return jsonify({'success': success, 'message': message, 'stats': stats}), code
        except Exception as e:
            Log().write_log(f"迁移到 SQLite 失败: {e}", 'ERROR')
            return jsonify({'error': str(e)}), 500
