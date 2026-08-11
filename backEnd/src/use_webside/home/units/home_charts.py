"""
Home 页面图表数据模块
提供库存、组件、购入、出售的全量数据查询（用于 Home 页面饼图）
"""
from flask import jsonify
from src.db_manager.database import DatabaseManager
import logging

logger = logging.getLogger(__name__)


def safe_float(value, default=0.0):
    """安全的浮点数转换"""
    if value is None or value == '' or value == '--':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


class HomeCharts:

    @staticmethod
    def get_all_inventory():
        """获取所有Steam账号的库存数据（用于Home页面图表）"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT
                assetid, instanceid, classid, item_name, weapon_name, float_range,
                weapon_type, weapon_float, remark, data_user, buy_price, yyyp_price,
                buff_price, steam_price, order_time, steam_hash_name,
                sticker, pendant, rename
            FROM steam_inventory
            WHERE if_inventory = '1'
            ORDER BY
                CASE
                    WHEN weapon_type = '未知物品' THEN 1
                    ELSE 0
                END,
                CAST(buy_price AS REAL) DESC
            """

            results = db.execute_query(sql)

            inventory_list = []
            if results:
                for row in results:
                    item = {
                        'assetid': row[0],
                        'instanceid': row[1],
                        'classid': row[2],
                        'item_name': row[3],
                        'weapon_name': row[4],
                        'float_range': row[5],
                        'weapon_type': row[6],
                        'weapon_float': row[7],
                        'remark': row[8],
                        'data_user': row[9],
                        'buy_price': safe_float(row[10]),
                        'yyyp_price': safe_float(row[11]),
                        'buff_price': safe_float(row[12]),
                        'steam_price': safe_float(row[13]),
                        'order_time': row[14],
                        'steam_hash_name': row[15],
                        'sticker': row[16],
                        'pendant': row[17],
                        'rename': row[18]
                    }
                    inventory_list.append(item)

            return jsonify({
                'success': True,
                'data': inventory_list,
                'total': len(inventory_list)
            }), 200

        except Exception as e:
            logger.error(f"获取所有库存数据失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': []
            }), 500

    @staticmethod
    def get_all_components():
        """获取所有Steam账号的库存组件数据（用于Home页面图表）"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT
                assetid, goods_assetid, classid, item_name, weapon_name,
                float_range, weapon_type, weapon_float, weapon_level, data_user,
                buy_price, yyyp_price, buff_price, order_time, steam_price,
                steam_hash_name, sticker, pendant, rename
            FROM steam_stockComponents
            ORDER BY order_time DESC
            """

            results = db.execute_query(sql)

            components_list = []
            if results:
                for row in results:
                    component = {
                        'assetid': row[0],
                        'goods_assetid': row[1],
                        'component_id': row[1],
                        'classid': row[2],
                        'item_name': row[3],
                        'weapon_name': row[4],
                        'float_range': row[5],
                        'weapon_type': row[6],
                        'weapon_float': row[7],
                        'weapon_level': row[8],
                        'data_user': row[9],
                        'buy_price': safe_float(row[10]),
                        'yyyp_price': safe_float(row[11]),
                        'buff_price': safe_float(row[12]),
                        'order_time': row[13],
                        'steam_price': safe_float(row[14]),
                        'steam_hash_name': row[15],
                        'sticker': row[16],
                        'pendant': row[17],
                        'rename': row[18]
                    }
                    components_list.append(component)

            return jsonify({
                'success': True,
                'data': components_list,
                'total': len(components_list)
            }), 200

        except Exception as e:
            logger.error(f"获取所有库存组件数据失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': []
            }), 500

    @staticmethod
    def get_all_buy():
        """获取所有Steam账号的购入数据（用于Home页面图表）"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT
                [ID], weapon_name, item_name, weapon_type, float_range,
                weapon_float, price, order_time, [from], data_user,
                status, status_sub, steam_hash_name
            FROM buy
            WHERE status = '已完成'
            ORDER BY order_time DESC
            """

            results = db.execute_query(sql)

            buy_list = []
            if results:
                for row in results:
                    item = {
                        'id': row[0],
                        'weapon_name': row[1],
                        'item_name': row[2],
                        'weapon_type': row[3],
                        'float_range': row[4],
                        'weapon_float': safe_float(row[5]),
                        'buy_price': safe_float(row[6]),
                        'price': safe_float(row[6]),
                        'order_time': row[7],
                        'source': row[8],
                        'data_user': row[9],
                        'status': row[10],
                        'status_sub': row[11],
                        'steam_hash_name': row[12]
                    }
                    buy_list.append(item)

            return jsonify({
                'success': True,
                'data': buy_list,
                'total': len(buy_list)
            }), 200

        except Exception as e:
            logger.error(f"获取所有购入数据失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': []
            }), 500

    @staticmethod
    def get_all_sell():
        """获取所有Steam账号的出售数据（用于Home页面图表）"""
        try:
            db = DatabaseManager()

            sql = """
            SELECT
                [ID], weapon_name, item_name, weapon_type, float_range,
                weapon_float, price, order_time, [from], data_user,
                status, status_sub, steam_hash_name
            FROM sell
            WHERE status = '已完成'
            ORDER BY order_time DESC
            """

            results = db.execute_query(sql)

            sell_list = []
            if results:
                for row in results:
                    item = {
                        'id': row[0],
                        'weapon_name': row[1],
                        'item_name': row[2],
                        'weapon_type': row[3],
                        'float_range': row[4],
                        'weapon_float': safe_float(row[5]),
                        'sell_price': safe_float(row[6]),
                        'price': safe_float(row[6]),
                        'order_time': row[7],
                        'source': row[8],
                        'data_user': row[9],
                        'status': row[10],
                        'status_sub': row[11],
                        'steam_hash_name': row[12]
                    }
                    sell_list.append(item)

            return jsonify({
                'success': True,
                'data': sell_list,
                'total': len(sell_list)
            }), 200

        except Exception as e:
            logger.error(f"获取所有出售数据失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': []
            }), 500
