"""
Home 页面指定账号库存模块
从 webInventoryV1/inventory 分离的 Home 简化版
仅支持 limit/offset 参数，不含复杂筛选和价格自动填充
"""
from flask import jsonify, request
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


class HomeInventory:

    @staticmethod
    def get_inventory(steam_id):
        """获取指定Steam账号的库存数据（Home页面简化版）"""
        try:
            limit = request.args.get('limit', 999999, type=int)
            offset = request.args.get('offset', 0, type=int)

            db = DatabaseManager()

            sql = """
            SELECT
                assetid, instanceid, classid, item_name, weapon_name, float_range,
                weapon_type, weapon_float, remark, data_user, buy_price, yyyp_price,
                buff_price, steam_price, order_time, steam_hash_name,
                sticker, pendant, rename
            FROM steam_inventory
            WHERE data_user = ? AND if_inventory = '1'
            ORDER BY
                CASE
                    WHEN weapon_type = '未知物品' THEN 1
                    ELSE 0
                END,
                CAST(buy_price AS REAL) DESC
            LIMIT ? OFFSET ?
            """

            results = db.execute_query(sql, (steam_id, limit, offset))

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
            logger.error(f"获取指定账号库存数据失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': []
            }), 500
