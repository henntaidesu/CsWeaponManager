"""
数据源操作模块
提供数据源的连接测试、数据采集、启用/禁用切换功能
"""
from flask import jsonify, request
from src.units.log import Log
from src.db_manager.database import DatabaseManager
from src.units.execution_db import Date_base
import time
import random
from datetime import datetime
import json


class DataSourceOps:
    """数据源操作类 - 提供测试、采集、切换功能"""

    @staticmethod
    def test_connection():
        """测试数据源连接"""
        try:
            data = request.get_json()

            datasource_type = data.get('type', '')
            api_url = data.get('apiUrl', '')

            if not api_url:
                return jsonify({
                    'success': False,
                    'message': 'API地址不能为空'
                }), 400

            # 模拟连接测试
            time.sleep(1)

            return jsonify({
                'success': True,
                'message': '连接测试成功',
                'data': {
                    'latency': '150ms',
                    'status': 'online'
                }
            }), 200

        except Exception as e:
            Log().write_log(f"测试数据源连接失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'连接测试失败: {str(e)}'
            }), 500

    @staticmethod
    def collect_data_source(data_id):
        """启动数据源采集"""
        try:
            data = request.get_json()

            # 验证数据源是否存在且启用
            check_sql = f"SELECT dataName, status FROM config WHERE dataID = {data_id} LIMIT 1"

            db = DatabaseManager()
            result = db.execute_query(check_sql, ())

            if not result:
                return jsonify({
                    'success': False,
                    'message': '数据源不存在'
                }), 404

            data_name = result[0][0]
            status = result[0][1]

            if status != '1':
                return jsonify({
                    'success': False,
                    'message': '数据源未启用，无法采集'
                }), 400

            Log().write_log(f"开始采集数据源: {data_name} (ID: {data_id})", 'info')

            # 模拟采集
            time.sleep(2)
            collected_count = random.randint(50, 500)

            Log().write_log(f"采集完成: {data_name}, 采集到 {collected_count} 条数据", 'info')

            return jsonify({
                'success': True,
                'message': f'数据源 {data_name} 采集完成',
                'data': {
                    'dataSourceId': data_id,
                    'dataSourceName': data_name,
                    'count': collected_count,
                    'startTime': datetime.now().isoformat(),
                    'status': 'completed'
                }
            }), 200

        except Exception as e:
            Log().write_log(f"采集数据源失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'采集失败: {str(e)}'
            }), 500

    @staticmethod
    def toggle_data_source(data_id):
        """切换数据源启用状态"""
        try:
            data = request.get_json()
            enabled = data.get('enabled', True)
            status = '1' if enabled else '0'

            update_sql = f"UPDATE config SET status = '{status}' WHERE dataID = {data_id}"

            db = DatabaseManager()
            ok = Date_base().update(update_sql)

            if ok is True:
                return jsonify({
                    'success': True,
                    'message': f'数据源已{"启用" if enabled else "禁用"}'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': '更新状态失败'
                }), 500

        except Exception as e:
            Log().write_log(f"切换数据源状态失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'服务器错误: {str(e)}'
            }), 500

    @staticmethod
    def pause_data_source():
        """按平台类型 + steamID 暂停数据源（供 Spider 在账号需要重新登录时回调）。"""
        try:
            data = request.get_json() or {}
            source_type = str(data.get("type") or "").strip()
            steam_id = str(data.get("steamID") or "").strip()
            reason = str(data.get("reason") or "").strip()
            if not source_type or not steam_id:
                return jsonify({
                    'success': False,
                    'message': 'type 和 steamID 不能为空'
                }), 400

            db = DatabaseManager()
            rows = db.execute_query(
                "SELECT dataID, dataName FROM config WHERE key1 = ? AND key2 = 'config' AND steamID = ? ORDER BY dataID DESC LIMIT 1",
                (source_type, steam_id),
            )
            if not rows:
                return jsonify({
                    'success': False,
                    'message': f'未找到 type={source_type}, steamID={steam_id} 的数据源'
                }), 404

            data_id, data_name = rows[0]
            update_sql = f"UPDATE config SET status = '0' WHERE dataID = {int(data_id)}"
            ok = Date_base().update(update_sql)
            if ok is not True:
                return jsonify({
                    'success': False,
                    'message': '暂停数据源失败'
                }), 500

            Log().write_log(
                f"数据源已自动暂停: {data_name} (ID: {data_id}, type: {source_type}, steamID: {steam_id})，原因: {reason or '未提供'}",
                'warning'
            )
            return jsonify({
                'success': True,
                'message': f'数据源 {data_name} 已暂停',
                'data': {'dataID': data_id, 'steamID': steam_id}
            }), 200
        except Exception as e:
            Log().write_log(f"暂停数据源失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'服务器错误: {str(e)}'
            }), 500

    @staticmethod
    def update_c5_access_token():
        """按 steamID 更新 C5 数据源 config 中的 x_access_token。"""
        try:
            data = request.get_json() or {}
            steam_id = str(data.get("steamID") or "").strip()
            access_token = str(data.get("accessToken") or "").strip()
            if not steam_id or not access_token:
                return jsonify({
                    'success': False,
                    'message': 'steamID 和 accessToken 不能为空'
                }), 400

            db = DatabaseManager()
            rows = db.execute_query(
                "SELECT dataID, value FROM config WHERE key1 = 'c5game' AND key2 = 'config' AND steamID = ? ORDER BY dataID DESC LIMIT 1",
                (steam_id,),
            )
            if not rows:
                return jsonify({
                    'success': False,
                    'message': f'未找到 steamID={steam_id} 的 C5 数据源'
                }), 404

            data_id, value = rows[0]
            try:
                config = json.loads(value or "{}")
                if not isinstance(config, dict):
                    config = {}
            except Exception:
                config = {}

            config["x_access_token"] = access_token
            updated_value = json.dumps(config, ensure_ascii=False).replace("'", "''")
            update_sql = f"UPDATE config SET value = '{updated_value}' WHERE dataID = {int(data_id)} AND key2 = 'config'"
            ok = Date_base().update(update_sql)
            if ok is not True:
                return jsonify({
                    'success': False,
                    'message': '更新 accessToken 失败'
                }), 500

            return jsonify({
                'success': True,
                'message': 'C5 accessToken 更新成功',
                'data': {'dataID': data_id, 'steamID': steam_id}
            }), 200
        except Exception as e:
            Log().write_log(f"更新 C5 accessToken 失败: {str(e)}", 'error')
            return jsonify({
                'success': False,
                'message': f'服务器错误: {str(e)}'
            }), 500
