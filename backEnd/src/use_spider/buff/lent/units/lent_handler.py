"""
BUFF lent 处理模块
提供 Spider 所需的租出记录查询、插入与状态更新接口

写入统一的 lent 表（from='buff'），与 rental（租入）对称。
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager
from src.units.now_time import today
from src.db_manager.manager import LentModel


class LentHandler:

    @staticmethod
    def count_data(data_user):
        """统计指定用户的 BUFF 租出订单数量"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT COUNT(*) FROM lent WHERE data_user = ? AND "from" = ?',
                (data_user, 'buff'),
            )
            count = rows[0][0] if rows else 0
            return jsonify({"count": count}), 200
        except Exception as e:
            print(f"统计BUFF租出订单数量失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"error": "统计失败"}), 500

    @staticmethod
    def insert_db():
        """插入 BUFF 租出订单数据到 lent 表"""
        try:
            data = request.get_json()

            order_id = data.get('order_id', '')
            weapon_type = data.get('weapon_type', '')
            item_name = data.get('item_name', '')
            weapon_name = data.get('weaponitem_name', '')
            float_range = data.get('float_range', '')
            weapon_float = data.get('weapon_float', None)
            rent_unit_price = data.get('rent_unit_price', '')
            state = data.get('state', '')
            state_sub = data.get('state_sub', '')
            rent_start_time = data.get('rent_start_time', '')
            rent_end_time = data.get('rent_end_time', '')
            # 租出方视角：对方是租客
            buyer_id = data.get('buyer_id', '')
            rented_day = data.get('rented_day', 0)
            max_rent_out_day = data.get('max_rent_out_day', 0)
            data_user = data.get('data_user', '')
            steam_id = data.get('steam_id', '')
            sticker = data.get('sticker', None)
            pendant = data.get('pendant', None)
            rename = data.get('rename', None)
            market_hash_name = data.get('market_hash_name', '')
            img_url = data.get('img_url', '')

            steam_hash_name = market_hash_name if market_hash_name else img_url if img_url else None

            lent_data = {
                'ID': order_id,
                'weapon_name': weapon_name,
                'weapon_type': weapon_type,
                'item_name': item_name,
                'steam_hash_name': steam_hash_name,
                'sticker': sticker,
                'pendant': pendant,
                'rename': rename,
                'weapon_float': weapon_float,
                'float_range': float_range,
                'price': rent_unit_price,
                'total_Lease_Days': rented_day,
                'max_Lease_Days': max_rent_out_day,
                'lean_start_time': rent_start_time,
                'lean_end_time': rent_end_time,
                'lenter_name': buyer_id,
                'from': 'buff',
                'status': state,
                'status_sub': state_sub,
                'last_status': state_sub,
                'steam_id': steam_id,
                'data_user': data_user,
            }

            lent_model = LentModel(**lent_data)
            result = lent_model.save()

            if result:
                return jsonify({"success": True, "message": "数据插入成功"}), 200
            return jsonify({"success": False, "message": "数据插入失败"}), 500

        except Exception as e:
            print(f"插入BUFF租出数据失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500

    @staticmethod
    def get_latest_data(data_user):
        """获取指定用户最新的 BUFF 租出订单数据"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                """
                SELECT ID, lean_start_time
                FROM lent
                WHERE data_user = ? AND "from" = ?
                ORDER BY lean_start_time DESC
                LIMIT 1
                """,
                (data_user, 'buff'),
            )
            if rows:
                return jsonify({"ID": rows[0][0], "order_time": rows[0][1]}), 200

            return jsonify({"message": "数据库为空，请先执行全量采集"}), 200

        except Exception as e:
            print(f"获取最新BUFF租出数据失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def select_not_end(data_user):
        """查询指定用户需要更新状态的 BUFF 租出订单"""
        try:
            current_time = today()
            db = DatabaseManager()
            rows = db.execute_query(
                """
                SELECT ID
                FROM lent
                WHERE data_user = ?
                    AND "from" = ?
                    AND status NOT IN ('已完成', '已取消', '已归还')
                    AND (
                        (lean_end_time <= ? AND status = '租赁中')
                        OR
                        status NOT IN ('租赁中')
                    )
                ORDER BY lean_start_time DESC
                """,
                (data_user, 'buff', current_time),
            )
            order_ids = [row[0] for row in rows] if rows else []
            return jsonify({"not_end_orders": order_ids}), 200

        except Exception as e:
            print(f"查询未结束BUFF租出订单失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def update_order_status():
        """更新 BUFF 租出订单状态"""
        try:
            data = request.get_json()
            order_id = data.get('order_id', '')
            state = data.get('state', '')
            state_sub = data.get('state_sub', None)

            if not order_id:
                return jsonify({"success": False, "error": "订单ID不能为空"}), 400

            db = DatabaseManager()
            if state_sub is not None:
                sql = 'UPDATE lent SET status = ?, status_sub = ?, last_status = ? WHERE ID = ? AND "from" = ?'
                db.execute_update(sql, (state, state_sub, state_sub, order_id, 'buff'))
            else:
                sql = 'UPDATE lent SET status = ? WHERE ID = ? AND "from" = ?'
                db.execute_update(sql, (state, order_id, 'buff'))

            return jsonify({"success": True, "message": "状态更新成功"}), 200

        except Exception as e:
            print(f"更新BUFF租出订单状态失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500
