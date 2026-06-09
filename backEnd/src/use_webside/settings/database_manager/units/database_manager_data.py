"""
数据库管理模块
提供类似Navicat的数据库管理功能（支持 SQLite / MySQL 双后端）

设计要点：
- 结构化 CRUD / 内省统一走 DatabaseManager（占位符 ?、反引号标识符），
  由 DatabaseManager 在 MySQL 模式下自动翻译方言，因此本文件无需区分后端写两套 SQL。
- 用户在「SQL 执行」面板手写的 SQL 按当前后端原样执行（不翻译），
  因此单独用 _raw_dict_connection() 取一个 dict 行为的原始连接。
- 文件级操作（备份/下载/恢复）针对始终存在的基础 SQLite 文件。
"""
from flask import request, jsonify, send_file
from src.units.log import Log
from src.db_manager.database import DatabaseManager
import sqlite3
import os
import sys
import csv
import json
import io
from datetime import datetime


def _get_db_path():
    """获取基础 SQLite 文件路径（文件级操作使用）"""
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
        for _ in range(5):
            base_path = os.path.dirname(base_path)
    return os.path.join(base_path, 'csweaponmanager.db')


DB_PATH = _get_db_path()


def _dm():
    return DatabaseManager()


def _raw_dict_connection():
    """
    获取当前后端的原始连接，行为为「dict 行」（row.keys() / row[col] 可用）。
    用于执行用户手写的 SQL（按原后端方言，不做翻译）。
    返回 (conn, is_mysql)
    """
    dm = _dm()
    if dm.db_type == 'mysql':
        import pymysql
        from pymysql.cursors import DictCursor
        conn = pymysql.connect(
            host=dm.mysql_config['host'], port=dm.mysql_config['port'],
            user=dm.mysql_config['user'], password=dm.mysql_config['password'],
            database=dm.mysql_config['database'], charset='utf8mb4',
            autocommit=False, connect_timeout=10,
            sql_mode='NO_ENGINE_SUBSTITUTION', cursorclass=DictCursor)
        return conn, True
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn, False


def _decode(value):
    """统一处理单元格值（bytes -> str）"""
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore')
    return value


def _table_rows_as_dicts(table_name):
    """读取整表数据，返回 (columns, rows[dict])"""
    dm = _dm()
    cols = [c['name'] for c in dm.get_table_columns(table_name)]
    raw = dm.execute_query(f"SELECT * FROM `{table_name}`")
    data = []
    for row in raw:
        d = {}
        for i, col in enumerate(cols):
            d[col] = _decode(row[i]) if i < len(row) else None
        data.append(d)
    return cols, data


def _primary_keys(table_name):
    """获取表主键列名列表"""
    return [c['name'] for c in _dm().get_table_columns(table_name) if c.get('pk')]


def _get_db_size():
    """获取基础 SQLite 文件大小"""
    try:
        if os.path.exists(DB_PATH):
            size_bytes = os.path.getsize(DB_PATH)
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.2f} KB"
            else:
                return f"{size_bytes / (1024 * 1024):.2f} MB"
        return "0 B"
    except Exception as e:
        Log().write_log(f"获取数据库大小失败: {str(e)}", 'ERROR')
        return "未知"


def _execute_sql_internal(sql: str):
    """
    内部工具函数：执行一段包含 1~N 条 SQL 语句的字符串（按当前后端原样执行）
    """
    sql = (sql or '').strip()
    if not sql:
        raise ValueError('SQL语句不能为空')

    conn, is_mysql = _raw_dict_connection()
    cursor = conn.cursor()

    # 分割多条SQL语句（按分号分割）
    statements = []
    current_statement = ''
    in_string = False
    string_char = None

    for char in sql:
        if char in ("'", '"') and (not current_statement or current_statement[-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            current_statement += char
        elif char == ';' and not in_string:
            stmt = current_statement.strip()
            if stmt:
                statements.append(stmt)
            current_statement = ''
        else:
            current_statement += char

    if current_statement.strip():
        statements.append(current_statement.strip())

    statements = [stmt for stmt in statements if stmt and stmt.strip()]

    if not statements:
        conn.close()
        raise ValueError('没有有效的SQL语句')

    total_affected_rows = 0
    last_select_result = None
    last_select_columns = []
    execution_details = []

    for i, statement in enumerate(statements, 1):
        try:
            statement_upper = statement.upper().strip()
            cursor.execute(statement)

            if statement_upper.startswith('SELECT'):
                rows = cursor.fetchall()
                columns = [description[0] for description in cursor.description] if cursor.description else []

                data = []
                for row in rows:
                    row_dict = {}
                    for key in row.keys():
                        row_dict[key] = _decode(row[key])
                    data.append(row_dict)

                last_select_result = data
                last_select_columns = columns
                execution_details.append({
                    'statement': statement[:100] + ('...' if len(statement) > 100 else ''),
                    'type': 'SELECT',
                    'rows': len(data),
                    'success': True
                })
            else:
                affected_rows = cursor.rowcount
                total_affected_rows += affected_rows
                execution_details.append({
                    'statement': statement[:100] + ('...' if len(statement) > 100 else ''),
                    'type': statement_upper.split()[0] if statement_upper.split() else 'UNKNOWN',
                    'affected_rows': affected_rows,
                    'success': True
                })

        except Exception as e:
            conn.rollback()
            conn.close()
            error_msg = f"执行第 {i} 条语句时出错: {str(e)}"
            Log().write_log(f"执行SQL失败: {error_msg}\n语句: {statement[:200]}", 'ERROR')
            raise RuntimeError(json.dumps({
                'error': error_msg,
                'statement_index': i,
                'statement': statement[:200],
                'execution_details': execution_details
            }, ensure_ascii=False))

    conn.commit()
    conn.close()

    if last_select_result is not None:
        Log().write_log(f"执行 {len(statements)} 条SQL语句成功，最后一条SELECT返回 {len(last_select_result)} 行", 'INFO')
        return {
            'rows': last_select_result,
            'columns': last_select_columns,
            'message': f'成功执行 {len(statements)} 条语句，最后一条SELECT返回 {len(last_select_result)} 行',
            'execution_details': execution_details,
            'total_statements': len(statements)
        }
    else:
        Log().write_log(f"执行 {len(statements)} 条SQL语句成功，总共影响 {total_affected_rows} 行", 'INFO')
        return {
            'rows': [],
            'columns': [],
            'message': f'成功执行 {len(statements)} 条语句，总共影响 {total_affected_rows} 行',
            'execution_details': execution_details,
            'total_statements': len(statements),
            'total_affected_rows': total_affected_rows
        }


class DatabaseManagerData:
    """数据库管理类 - 提供完整的数据库管理 API"""

    @staticmethod
    def get_tables():
        """获取所有表列表"""
        try:
            dm = _dm()
            tables = []
            for table_name in dm.get_all_tables():
                try:
                    result = dm.execute_query(f"SELECT COUNT(*) FROM `{table_name}`")
                    count = result[0][0] if result else 0
                except Exception:
                    count = 0
                tables.append({'name': table_name, 'rowCount': count})

            Log().write_log(f"获取表列表成功，共 {len(tables)} 个表", 'INFO')
            return jsonify(tables)
        except Exception as e:
            Log().write_log(f"获取表列表失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_table_data(table_name):
        """获取表数据"""
        try:
            cols, data = _table_rows_as_dicts(table_name)
            columns = [{'name': c} for c in cols]
            Log().write_log(f"获取表 {table_name} 数据成功，共 {len(data)} 行", 'INFO')
            return jsonify({'columns': columns, 'rows': data})
        except Exception as e:
            Log().write_log(f"获取表数据失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_table_structure(table_name):
        """获取表结构"""
        try:
            dm = _dm()
            structure = []
            for col in dm.get_table_columns(table_name):
                structure.append({
                    'cid': col.get('cid'),
                    'name': col.get('name'),
                    'type': col.get('type'),
                    'notnull': 1 if col.get('notnull') else 0,
                    'dflt_value': col.get('default_value'),
                    'pk': 1 if col.get('pk') else 0,
                })

            # 建表语句
            create_sql = ''
            try:
                if dm.db_type == 'mysql':
                    res = dm.execute_query(f"SHOW CREATE TABLE `{table_name}`")
                    create_sql = res[0][1] if res and len(res[0]) > 1 else ''
                else:
                    res = dm.execute_query(
                        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                        (table_name,))
                    create_sql = res[0][0] if res else ''
            except Exception:
                create_sql = ''

            cnt = dm.execute_query(f"SELECT COUNT(*) FROM `{table_name}`")
            row_count = cnt[0][0] if cnt else 0

            Log().write_log(f"获取表 {table_name} 结构成功", 'INFO')
            return jsonify({
                'structure': structure,
                'sql': create_sql,
                'info': {'createTime': '-', 'rowCount': row_count}
            })
        except Exception as e:
            Log().write_log(f"获取表结构失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def add_row(table_name):
        """新增数据行"""
        try:
            data = request.json
            if not data:
                return jsonify({'error': '数据不能为空'}), 400

            filtered_data = {k: v for k, v in data.items() if v is not None and v != ''}
            if not filtered_data:
                return jsonify({'error': '没有有效的数据'}), 400

            columns = ', '.join([f'`{k}`' for k in filtered_data.keys()])
            placeholders = ', '.join(['?' for _ in filtered_data.keys()])
            values = tuple(filtered_data.values())

            sql = f"INSERT INTO `{table_name}` ({columns}) VALUES ({placeholders})"
            _dm().execute_insert(sql, values)

            Log().write_log(f"新增数据到表 {table_name} 成功", 'INFO')
            return jsonify({'success': True, 'message': '新增成功'})
        except Exception as e:
            Log().write_log(f"新增数据失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def update_row(table_name):
        """更新数据行"""
        try:
            request_data = request.json
            data = request_data.get('data', {})
            if not data:
                return jsonify({'error': '数据不能为空'}), 400

            primary_keys = _primary_keys(table_name)
            if not primary_keys:
                return jsonify({'error': '表没有主键，无法更新'}), 400

            where_conditions = []
            where_values = []
            for pk in primary_keys:
                if pk in data:
                    where_conditions.append(f"`{pk}` = ?")
                    where_values.append(data[pk])
            if not where_conditions:
                return jsonify({'error': '缺少主键值'}), 400

            update_fields = [k for k in data.keys() if k not in primary_keys]
            if not update_fields:
                return jsonify({'error': '没有要更新的字段'}), 400

            set_clause = ', '.join([f"`{k}` = ?" for k in update_fields])
            set_values = [data[k] for k in update_fields]
            where_clause = ' AND '.join(where_conditions)

            sql = f"UPDATE `{table_name}` SET {set_clause} WHERE {where_clause}"
            affected_rows = _dm().execute_update(sql, tuple(set_values + where_values))

            Log().write_log(f"更新表 {table_name} 数据成功，影响 {affected_rows} 行", 'INFO')
            return jsonify({'success': True, 'message': f'更新成功，影响 {affected_rows} 行'})
        except Exception as e:
            Log().write_log(f"更新数据失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def delete_row(table_name):
        """删除数据行"""
        try:
            request_data = request.json
            row = request_data.get('row', {})
            if not row:
                return jsonify({'error': '数据不能为空'}), 400

            primary_keys = _primary_keys(table_name)
            if not primary_keys:
                return jsonify({'error': '表没有主键，无法删除'}), 400

            where_conditions = []
            where_values = []
            for pk in primary_keys:
                if pk in row:
                    where_conditions.append(f"`{pk}` = ?")
                    where_values.append(row[pk])
            if not where_conditions:
                return jsonify({'error': '缺少主键值'}), 400

            where_clause = ' AND '.join(where_conditions)
            sql = f"DELETE FROM `{table_name}` WHERE {where_clause}"
            affected_rows = _dm().execute_update(sql, tuple(where_values))

            Log().write_log(f"删除表 {table_name} 数据成功，影响 {affected_rows} 行", 'INFO')
            return jsonify({'success': True, 'message': f'删除成功，影响 {affected_rows} 行'})
        except Exception as e:
            Log().write_log(f"删除数据失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def delete_batch(table_name):
        """批量删除数据"""
        try:
            request_data = request.json
            rows = request_data.get('rows', [])
            if not rows:
                return jsonify({'error': '没有选择要删除的数据'}), 400

            primary_keys = _primary_keys(table_name)
            if not primary_keys:
                return jsonify({'error': '表没有主键，无法删除'}), 400

            dm = _dm()
            deleted_count = 0
            for row in rows:
                where_conditions = []
                where_values = []
                for pk in primary_keys:
                    if pk in row:
                        where_conditions.append(f"`{pk}` = ?")
                        where_values.append(row[pk])
                if where_conditions:
                    where_clause = ' AND '.join(where_conditions)
                    sql = f"DELETE FROM `{table_name}` WHERE {where_clause}"
                    deleted_count += dm.execute_update(sql, tuple(where_values))

            Log().write_log(f"批量删除表 {table_name} 数据成功，删除 {deleted_count} 行", 'INFO')
            return jsonify({'success': True, 'message': f'成功删除 {deleted_count} 条数据'})
        except Exception as e:
            Log().write_log(f"批量删除失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def export_table(table_name):
        """导出表数据"""
        try:
            export_format = request.args.get('format', 'csv')
            columns, data = _table_rows_as_dicts(table_name)

            if export_format == 'csv':
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(columns)
                for row in data:
                    writer.writerow([str(row[c]) if row[c] is not None else '' for c in columns])
                output.seek(0)

                Log().write_log(f"导出表 {table_name} 为CSV成功", 'INFO')
                return send_file(
                    io.BytesIO(output.getvalue().encode('utf-8-sig')),
                    mimetype='text/csv',
                    as_attachment=True,
                    download_name=f'{table_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
                )

            elif export_format == 'json':
                Log().write_log(f"导出表 {table_name} 为JSON成功", 'INFO')
                return send_file(
                    io.BytesIO(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')),
                    mimetype='application/json',
                    as_attachment=True,
                    download_name=f'{table_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
                )
            else:
                return jsonify({'error': '不支持的导出格式'}), 400
        except Exception as e:
            Log().write_log(f"导出表数据失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def execute_query():
        """执行SQL查询（支持多条语句）"""
        try:
            request_data = request.json
            sql = request_data.get('sql', '').strip()
            if not sql:
                return jsonify({'error': 'SQL语句不能为空'}), 400
            result = _execute_sql_internal(sql)
            return jsonify(result)
        except RuntimeError as e:
            try:
                payload = json.loads(str(e))
                return jsonify(payload), 500
            except Exception:
                Log().write_log(f"执行SQL失败（解析内部错误信息失败）: {str(e)}", 'ERROR')
                return jsonify({'error': str(e)}), 500
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            Log().write_log(f"执行SQL失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def execute_sql_file():
        """上传并执行 SQL 文件"""
        try:
            if 'file' not in request.files:
                return jsonify({'error': '没有上传文件'}), 400

            file = request.files['file']
            if not file or file.filename == '':
                return jsonify({'error': '文件名为空'}), 400

            allowed_extensions = {'.sql', '.txt'}
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in allowed_extensions:
                return jsonify({'error': '仅支持 .sql / .txt 文件'}), 400

            try:
                content = file.read().decode('utf-8')
            except UnicodeDecodeError:
                file.seek(0)
                content = file.read().decode('gbk', errors='ignore')

            result = _execute_sql_internal(content)
            result['file'] = file.filename
            return jsonify(result)
        except RuntimeError as e:
            try:
                payload = json.loads(str(e))
                return jsonify(payload), 500
            except Exception:
                Log().write_log(f"执行 SQL 文件失败（解析内部错误信息失败）: {str(e)}", 'ERROR')
                return jsonify({'error': str(e)}), 500
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            Log().write_log(f"执行 SQL 文件失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_saved_queries():
        """获取已保存的查询"""
        try:
            return jsonify([])
        except Exception as e:
            Log().write_log(f"获取已保存查询失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def save_query():
        """保存查询"""
        try:
            request_data = request.json
            name = request_data.get('name', '')
            sql = request_data.get('sql', '')
            if not name or not sql:
                return jsonify({'error': '查询名称和SQL不能为空'}), 400
            Log().write_log(f"保存查询 {name} 成功", 'INFO')
            return jsonify({'success': True, 'message': '查询已保存'})
        except Exception as e:
            Log().write_log(f"保存查询失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_database_stats():
        """获取数据库统计信息"""
        try:
            dm = _dm()
            table_names = dm.get_all_tables()
            total_records = 0
            for name in table_names:
                try:
                    res = dm.execute_query(f"SELECT COUNT(*) FROM `{name}`")
                    total_records += res[0][0] if res else 0
                except Exception:
                    pass

            if dm.db_type == 'mysql':
                db_size = '-'
                try:
                    res = dm.execute_query(
                        "SELECT ROUND(SUM(data_length+index_length)/1024/1024, 2) "
                        "FROM information_schema.tables WHERE table_schema=%s",
                        (dm.mysql_database,))
                    if res and res[0][0] is not None:
                        db_size = f"{res[0][0]} MB"
                except Exception:
                    pass
                last_update = '-'
            else:
                db_size = _get_db_size()
                last_update = (datetime.fromtimestamp(os.path.getmtime(DB_PATH)).strftime('%Y-%m-%d %H:%M:%S')
                               if os.path.exists(DB_PATH) else '-')

            Log().write_log("获取数据库统计信息成功", 'INFO')
            return jsonify({
                'size': db_size,
                'tables': len(table_names),
                'records': total_records,
                'lastUpdate': last_update
            })
        except Exception as e:
            Log().write_log(f"获取数据库统计失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_database_info():
        """获取数据库详细信息"""
        try:
            dm = _dm()
            table_names = dm.get_all_tables()
            total_rows = 0
            for name in table_names:
                try:
                    res = dm.execute_query(f"SELECT COUNT(*) FROM `{name}`")
                    total_rows += res[0][0] if res else 0
                except Exception:
                    pass

            if dm.db_type == 'mysql':
                info = {
                    'name': dm.mysql_database,
                    'path': f"MySQL: {dm.mysql_config.get('host')}:{dm.mysql_config.get('port')}/{dm.mysql_database}",
                    'size': 0,
                    'totalRows': total_rows,
                    'createTime': 'N/A',
                    'modifyTime': 'N/A',
                    'dbType': 'mysql',
                }
                try:
                    res = dm.execute_query(
                        "SELECT SUM(data_length+index_length) "
                        "FROM information_schema.tables WHERE table_schema=%s",
                        (dm.mysql_database,))
                    if res and res[0][0] is not None:
                        info['size'] = int(res[0][0])
                except Exception:
                    pass
            else:
                file_size = 0
                create_time = 'N/A'
                modify_time = 'N/A'
                if os.path.exists(DB_PATH):
                    file_size = os.path.getsize(DB_PATH)
                    create_time = datetime.fromtimestamp(os.path.getctime(DB_PATH)).strftime('%Y-%m-%d %H:%M:%S')
                    modify_time = datetime.fromtimestamp(os.path.getmtime(DB_PATH)).strftime('%Y-%m-%d %H:%M:%S')
                info = {
                    'name': os.path.basename(DB_PATH),
                    'path': DB_PATH,
                    'size': file_size,
                    'totalRows': total_rows,
                    'createTime': create_time,
                    'modifyTime': modify_time,
                    'dbType': 'sqlite',
                }

            Log().write_log("获取数据库信息成功", 'INFO')
            return jsonify(info)
        except Exception as e:
            Log().write_log(f"获取数据库信息失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def backup_database():
        """备份基础 SQLite 数据库到服务器目录"""
        try:
            if not os.path.exists(DB_PATH):
                return jsonify({'error': '数据库文件不存在'}), 404

            import shutil
            backup_filename = f'csweaponmanager_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
            backup_path = os.path.join(os.path.dirname(DB_PATH), backup_filename)
            shutil.copy2(DB_PATH, backup_path)

            Log().write_log(f"数据库备份成功: {backup_path}", 'INFO')
            return jsonify({'message': f'数据库已备份到: {backup_filename}', 'path': backup_path})
        except Exception as e:
            Log().write_log(f"备份数据库失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def download_database():
        """下载基础 SQLite 数据库文件"""
        try:
            if not os.path.exists(DB_PATH):
                return jsonify({'error': '数据库文件不存在'}), 404
            Log().write_log("开始下载数据库", 'INFO')
            return send_file(
                DB_PATH,
                as_attachment=True,
                download_name=f'csweaponmanager_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db',
                mimetype='application/x-sqlite3'
            )
        except Exception as e:
            Log().write_log(f"下载数据库失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def restore_database():
        """恢复基础 SQLite 数据库"""
        try:
            if 'file' not in request.files:
                return jsonify({'error': '没有上传文件'}), 400

            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': '文件名为空'}), 400

            allowed_extensions = {'.db', '.sqlite', '.sqlite3'}
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in allowed_extensions:
                return jsonify({'error': '不支持的文件格式'}), 400

            backup_path = DB_PATH + f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
            if os.path.exists(DB_PATH):
                import shutil
                shutil.copy2(DB_PATH, backup_path)
                Log().write_log(f"当前数据库已备份到: {backup_path}", 'INFO')

            file.save(DB_PATH)
            Log().write_log("数据库恢复成功", 'INFO')
            return jsonify({'message': '数据库恢复成功'})
        except Exception as e:
            Log().write_log(f"恢复数据库失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def optimize_database():
        """优化数据库"""
        try:
            dm = _dm()
            operations = []
            if dm.db_type == 'mysql':
                for name in dm.get_all_tables():
                    try:
                        dm.execute_update(f"OPTIMIZE TABLE `{name}`")
                        operations.append(f'✓ 已优化表: {name}')
                    except Exception as e:
                        operations.append(f'✗ 优化表失败 {name}: {str(e)}')
            else:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('ANALYZE')
                operations.append('✓ 已收集数据库统计信息')
                cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
                for idx in cursor.fetchall():
                    try:
                        cursor.execute(f'REINDEX `{idx[0]}`')
                        operations.append(f'✓ 已重建索引: {idx[0]}')
                    except Exception as e:
                        operations.append(f'✗ 重建索引失败 {idx[0]}: {str(e)}')
                cursor.execute('PRAGMA integrity_check')
                integrity_result = cursor.fetchone()[0]
                operations.append('✓ 数据库完整性检查通过' if integrity_result == 'ok'
                                  else f'⚠ 数据库完整性检查: {integrity_result}')
                conn.commit()
                conn.close()

            Log().write_log(f"数据库优化成功: {', '.join(operations)}", 'INFO')
            return jsonify({'message': '数据库优化成功', 'operations': operations})
        except Exception as e:
            Log().write_log(f"优化数据库失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def vacuum_database():
        """清理数据库（VACUUM）"""
        try:
            dm = _dm()
            if dm.db_type == 'mysql':
                Log().write_log("MySQL 无需手动 VACUUM", 'INFO')
                return jsonify({'message': 'MySQL 由引擎自动管理空间，无需手动清理'})
            conn = sqlite3.connect(DB_PATH)
            conn.execute('VACUUM')
            conn.commit()
            conn.close()
            Log().write_log("数据库清理成功", 'INFO')
            return jsonify({'message': '数据库清理成功'})
        except Exception as e:
            Log().write_log(f"清理数据库失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def truncate_table():
        """清空表（删除所有数据但保留表结构）"""
        try:
            data = request.get_json()
            table_name = data.get('tableName')
            if not table_name:
                return jsonify({'error': '缺少表名参数'}), 400

            dm = _dm()
            if not dm.table_exists(table_name):
                return jsonify({'error': f'表 {table_name} 不存在'}), 404

            dm.execute_update(f"DELETE FROM `{table_name}`")
            # SQLite：重置自增序列
            if dm.db_type == 'sqlite':
                try:
                    if dm.table_exists('sqlite_sequence'):
                        dm.execute_update("DELETE FROM sqlite_sequence WHERE name=?", (table_name,))
                except Exception:
                    pass

            Log().write_log(f"清空表成功: {table_name}", 'INFO')
            return jsonify({'message': f'表 {table_name} 已清空'})
        except Exception as e:
            Log().write_log(f"清空表失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def drop_table():
        """删除表（永久删除表及其所有数据）"""
        try:
            data = request.get_json()
            table_name = data.get('tableName')
            if not table_name:
                return jsonify({'error': '缺少表名参数'}), 400

            dm = _dm()
            if not dm.table_exists(table_name):
                return jsonify({'error': f'表 {table_name} 不存在'}), 404

            dm.drop_table(table_name)
            Log().write_log(f"删除表成功: {table_name}", 'INFO')
            return jsonify({'message': f'表 {table_name} 已删除'})
        except Exception as e:
            Log().write_log(f"删除表失败: {str(e)}", 'ERROR')
            return jsonify({'error': str(e)}), 500
