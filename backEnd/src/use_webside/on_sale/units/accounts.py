"""
On Sale 页面账号查询模块
提供悠悠有品和BUFF平台的账号列表查询
"""
from flask import jsonify
from src.db_manager.database import DatabaseManager


class OnSaleAccounts:

    @staticmethod
    def get_yyyp_accounts():
        """获取悠悠有品账号列表"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT dataID, dataName, steamID
            FROM config
            WHERE key1 = ? AND key2 = ?
            ORDER BY dataID
            """
            results = db.execute_query(sql, ('youpin', 'config'))

            accounts = []
            for row in results:
                data_id = row[0]
                data_name = row[1] if row[1] else f"账号{data_id}"
                steam_id = row[2] if len(row) > 2 else None

                if not steam_id:
                    continue

                accounts.append({
                    'id': data_id,
                    'name': data_name,
                    'steam_id': steam_id
                })

            return jsonify({
                'success': True,
                'data': accounts
            }), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'获取悠悠有品账号列表失败: {str(e)}'
            }), 500

    @staticmethod
    def get_buff_accounts():
        """获取BUFF账号列表"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT dataID, dataName, steamID
            FROM config
            WHERE key1 = ? AND key2 = ?
            ORDER BY dataID
            """
            results = db.execute_query(sql, ('buff', 'config'))

            accounts = []
            for row in results:
                data_id = row[0]
                data_name = row[1] if row[1] else f"账号{data_id}"
                steam_id = row[2] if len(row) > 2 else None

                if not steam_id:
                    continue

                item_count = 0

                accounts.append({
                    'id': data_id,
                    'name': data_name,
                    'steam_id': steam_id,
                    'item_count': item_count
                })

            return jsonify({
                'success': True,
                'data': accounts
            }), 200

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'获取BUFF账号列表失败: {str(e)}'
            }), 500

    @staticmethod
    def get_igxe_accounts():
        """获取IGXE账号列表"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT dataID, dataName, steamID
            FROM config
            WHERE key1 = ? AND key2 = ?
            ORDER BY dataID
            """
            results = db.execute_query(sql, ('igxe', 'config'))

            accounts = []
            for row in results:
                data_id = row[0]
                data_name = row[1] if row[1] else f"账号{data_id}"
                steam_id = row[2] if len(row) > 2 else None

                if not steam_id:
                    continue

                accounts.append({
                    'id': data_id,
                    'name': data_name,
                    'steam_id': steam_id,
                    'item_count': 0
                })

            return jsonify({
                'success': True,
                'data': accounts
            }), 200

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'获取IGXE账号列表失败: {str(e)}'
            }), 500
