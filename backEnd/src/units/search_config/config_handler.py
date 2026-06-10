"""
公共配置管理模块
迁移自 src/config/config_v1.py
提供配置的增删改查功能，供各平台（youpin/buff/csfloat）及爬虫任务使用
"""
from flask import jsonify, request
from src.units.log import Log
from src.units.execution_db import Date_base, DatabaseManager
from src.db_manager.index.model.auto_search_weapon import AutoSearchWeaponModel


class SearchConfig:

    @staticmethod
    def get_config(key1, key2):
        """
        获取单条配置值
        路径参数: key1, key2
        返回: [[value]] 格式（兼容 Spider 端 ConfigAPI.get_value 解析）
        已暂停的数据源（status='0'）不返回，避免调度继续使用失效账号
        """
        try:
            sql = f"SELECT value FROM config WHERE key1 = '{key1}' and key2 = '{key2}' and (status IS NULL or status != '0')"
            flag, data = Date_base().select(sql)
            return jsonify(data), 200
        except Exception as e:
            Log().write_log(f"获取配置失败 [{key1}/{key2}]: {str(e)}", 'error')
            return jsonify([]), 500

    @staticmethod
    def save_config():
        """
        新增或更新配置（upsert）
        请求体: {dataName, key1, key2, value}
        """
        try:
            data = request.get_json()
            data_name = data.get('dataName')
            key1 = data.get('key1')
            key2 = data.get('key2')
            value = data.get('value')

            if not all([data_name, key1, key2, value]):
                return jsonify({
                    'success': False,
                    'message': '缺少必要参数'
                }), 400

            data_name_escaped = data_name.replace("'", "''")
            key1_escaped = key1.replace("'", "''")
            key2_escaped = key2.replace("'", "''")
            value_escaped = value.replace("'", "''")

            sql = f"SELECT dataID, dataName, key1, key2, value FROM config WHERE dataName = '{data_name_escaped}' AND key1 = '{key1_escaped}' AND key2 = '{key2_escaped}'"
            flag, existing = Date_base().select(sql)

            if flag and existing and len(existing) > 0:
                dataID = existing[0][0]
                Log().write_log(f"更新现有配置，dataID: {dataID}", 'info')
                update_sql = f"""
                    UPDATE config
                    SET value = '{value_escaped}'
                    WHERE dataID = {dataID}
                """
                Date_base().update(update_sql)
            else:
                insert_sql = f"""
                    INSERT INTO config (dataName, key1, key2, value, status)
                    VALUES ('{data_name_escaped}', '{key1_escaped}', '{key2_escaped}', '{value_escaped}', '1')
                """
                Date_base().insert(insert_sql)

            return jsonify({
                'success': True,
                'message': '保存成功'
            }), 200

        except Exception as e:
            Log().write_log(f"保存配置失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'保存失败: {str(e)}'
            }), 500

    @staticmethod
    def update_config():
        """
        更新现有配置（按 ID）
        请求体: {id, dataName, key1, key2, value}
        """
        try:
            data = request.get_json() or {}
            config_id = data.get('id')
            data_name = data.get('dataName')
            key1 = data.get('key1')
            key2 = data.get('key2')
            value = data.get('value')

            if not config_id:
                return jsonify({
                    'success': False,
                    'message': '缺少配置ID'
                }), 400

            try:
                config_id = int(config_id)
            except (TypeError, ValueError):
                return jsonify({
                    'success': False,
                    'message': '配置ID必须为整数'
                }), 400

            if not all([data_name, key1, key2, value]):
                return jsonify({
                    'success': False,
                    'message': '缺少必要参数'
                }), 400

            select_sql = f"SELECT dataID FROM config WHERE dataID = {config_id}"
            flag, existing = Date_base().select(select_sql)
            if not (flag and existing):
                return jsonify({
                    'success': False,
                    'message': '配置不存在或已被删除'
                }), 404

            data_name_escaped = data_name.replace("'", "''")
            key1_escaped = key1.replace("'", "''")
            key2_escaped = key2.replace("'", "''")
            value_escaped = value.replace("'", "''")

            update_sql = f"""
                UPDATE config
                SET dataName = '{data_name_escaped}',
                    key1 = '{key1_escaped}',
                    key2 = '{key2_escaped}',
                    value = '{value_escaped}'
                WHERE dataID = {config_id}
            """
            Date_base().update(update_sql)

            Log().write_log(f"更新配置成功，dataID: {config_id}", 'info')
            return jsonify({
                'success': True,
                'message': '更新成功',
                'data': {'id': config_id}
            }), 200

        except Exception as e:
            Log().write_log(f"更新配置失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'更新失败: {str(e)}'
            }), 500

    @staticmethod
    def list_configs():
        """
        按 key1/key2 查询配置列表
        参数: key1（可选）, key2（可选），至少提供一个
        """
        try:
            key1 = request.args.get('key1')
            key2 = request.args.get('key2')

            where_conditions = []
            if key1:
                where_conditions.append(f"key1 = '{key1}'")
            if key2:
                where_conditions.append(f"key2 = '{key2}'")

            if not where_conditions:
                return jsonify({
                    'success': False,
                    'message': '至少需要提供 key1 或 key2 参数'
                }), 400

            where_clause = ' AND '.join(where_conditions)
            sql = f"""
                SELECT dataID, dataName, key1, key2, value, status, steamID,
                       datetime('now') as updated_at
                FROM config
                WHERE {where_clause}
                ORDER BY dataID DESC
            """
            flag, result = Date_base().select(sql)

            data = []
            if result:
                for row in result:
                    data.append({
                        'id': row[0],
                        'dataName': row[1],
                        'key1': row[2],
                        'key2': row[3],
                        'value': row[4],
                        'status': row[5],
                        'steamID': row[6],
                        'updated_at': row[7]
                    })

            return jsonify({
                'success': True,
                'data': data
            }), 200

        except Exception as e:
            Log().write_log(f"获取配置列表失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'获取失败: {str(e)}'
            }), 500

    @staticmethod
    def delete_config(config_id):
        """
        删除配置，同时清理关联的搜索结果数据
        路径参数: config_id (int)
        """
        try:
            try:
                db = DatabaseManager()
                table_name = AutoSearchWeaponModel.get_table_name()

                count_sql = f"SELECT COUNT(*) FROM {table_name} WHERE config_id = ?"
                count_result = db.execute_query(count_sql, (config_id,))
                count = count_result[0][0] if count_result else 0

                if count > 0:
                    delete_sql = f"DELETE FROM {table_name} WHERE config_id = ?"
                    db.execute_update(delete_sql, (config_id,))
                    Log().write_log(
                        f"删除配置 {config_id} 时，已删除 {count} 条相关搜索结果数据",
                        'info'
                    )
                else:
                    Log().write_log(
                        f"删除配置 {config_id} 时，未找到相关搜索结果数据",
                        'info'
                    )
            except Exception as cleanup_error:
                Log().write_log(
                    f"清理配置 {config_id} 的搜索结果数据时出错: {str(cleanup_error)}",
                    'warning'
                )

            sql = f"DELETE FROM config WHERE dataID = {config_id}"
            Date_base().delete(sql)

            return jsonify({
                'success': True,
                'message': '删除成功'
            }), 200

        except Exception as e:
            Log().write_log(f"删除配置失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'删除失败: {str(e)}'
            }), 500
