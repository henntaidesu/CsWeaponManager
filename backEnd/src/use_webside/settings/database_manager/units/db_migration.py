# -*- coding: utf-8 -*-
"""
数据库后端配置与迁移

提供：
- 读取/保存数据库后端配置（SQLite / MySQL，连接参数保存在基础 SQLite 的 config 表）
- 测试 MySQL 连接
- 迁移到 MySQL（SQLite -> MySQL）
- 迁移到 SQLite（MySQL -> SQLite）

迁移思路：
- 用「源后端」的独立原始连接读取每张表的数据
- 把单例 DatabaseManager 临时指向「目标后端」，用模型重建表结构后写入数据
- 全部成功后，再把 db_type 持久化到引导配置（基础 SQLite 的 config 表）
"""
from flask import request, jsonify
from src.units.log import Log
from src.db_manager.database import (
    DatabaseManager, read_bootstrap_db_config, write_bootstrap_db_config,
)
from src.db_manager.manager import get_db_manager

_BATCH = 2000


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


def _read_source_rows(src_type, src_conn, table_name, target_columns):
    """
    从源后端读取一张表的数据。
    返回 (columns, rows)：columns 为「源表与模型字段的交集」，按模型字段顺序排列。
    """
    cursor = src_conn.cursor()
    if src_type == 'mysql':
        cursor.execute(f"SELECT * FROM `{table_name}`")
    else:
        cursor.execute(f"SELECT * FROM [{table_name}]")
    rows = cursor.fetchall()
    src_cols = [d[0] for d in cursor.description] if cursor.description else []
    src_index = {name: i for i, name in enumerate(src_cols)}

    # 仅复制模型定义且源表中存在的列，按模型字段顺序
    use_cols = [c for c in target_columns if c in src_index]
    aligned = []
    for row in rows:
        aligned.append(tuple(row[src_index[c]] for c in use_cols))
    return use_cols, aligned


def _copy_table(dm, table_name, columns, rows):
    """把数据写入目标后端（当前 dm 已指向目标）"""
    if not columns:
        return 0
    # 先清空目标表，避免主键冲突
    dm.execute_update(f"DELETE FROM [{table_name}]")
    if not rows:
        return 0
    col_sql = ', '.join(f"[{c}]" for c in columns)
    placeholders = ', '.join(['?'] * len(columns))
    sql = f"INSERT INTO [{table_name}] ({col_sql}) VALUES ({placeholders})"
    total = 0
    for i in range(0, len(rows), _BATCH):
        batch = rows[i:i + _BATCH]
        dm.execute_many(sql, batch)
        total += len(batch)
    return total


def _do_migration(source_type, target_type, target_mysql_cfg):
    """执行迁移，返回 (success, message, stats)"""
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
    try:
        # 目标为 MySQL：先确保数据库存在
        if target_type == 'mysql':
            server_conn = _mysql_connect(target_mysql_cfg, with_database=False)
            try:
                cur = server_conn.cursor()
                cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{target_mysql_cfg['database']}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")
            finally:
                server_conn.close()

        # 把单例指向目标后端
        dm.apply_backend(target_type, target_mysql_cfg if target_type == 'mysql' else None)

        # 在目标后端按模型重建所有表结构
        models = get_db_manager().models
        for model in models:
            model.ensure_table_exists()

        # 逐表复制数据
        for model in models:
            table_name = model.get_table_name()
            target_columns = list(model.get_fields().keys())
            try:
                cols, rows = _read_source_rows(source_type, src_conn, table_name, target_columns)
                copied = _copy_table(dm, table_name, cols, rows)
                stats[table_name] = copied
            except Exception as e:
                Log().write_log(f"迁移表 {table_name} 失败: {e}", 'ERROR')
                stats[table_name] = f"失败: {e}"

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
        return True, '迁移完成', stats

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
        """测试 MySQL 连接。body: {host, port, user, password, database?}"""
        try:
            data = request.json or {}
            cfg = {
                'host': data.get('host', ''),
                'port': data.get('port', 3306),
                'user': data.get('user', ''),
                'password': data.get('password', ''),
                'database': data.get('database', ''),
            }
            # 若未提供密码则使用已保存的密码
            if not cfg['password']:
                saved = read_bootstrap_db_config()
                cfg['password'] = saved.get('mysql_password', '')

            conn = _mysql_connect(cfg, with_database=bool(cfg.get('database')))
            try:
                cur = conn.cursor()
                cur.execute("SELECT VERSION()")
                version = cur.fetchone()[0]
            finally:
                conn.close()
            return jsonify({'success': True, 'message': f'连接成功，MySQL 版本 {version}'})
        except Exception as e:
            Log().write_log(f"测试 MySQL 连接失败: {e}", 'ERROR')
            return jsonify({'success': False, 'error': str(e)}), 400

    @staticmethod
    def migrate_to_mysql():
        """迁移到 MySQL（SQLite -> MySQL）。body: {host, port, user, password, database}"""
        try:
            data = request.json or {}
            cfg = {
                'host': data.get('host', ''),
                'port': data.get('port', 3306),
                'user': data.get('user', ''),
                'password': data.get('password', ''),
                'database': data.get('database', ''),
            }
            if not cfg['password']:
                saved = read_bootstrap_db_config()
                cfg['password'] = saved.get('mysql_password', '')

            if not (cfg['host'] and cfg['user'] and cfg['database']):
                return jsonify({'error': '请填写完整的 MySQL 连接参数（主机/用户/数据库）'}), 400

            if DatabaseManager().db_type == 'mysql':
                return jsonify({'error': '当前已经是 MySQL，无需迁移'}), 400

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
