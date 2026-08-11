"""
IGXE lent 处理模块
提供 Spider 所需的租出（lease/lessor）记录查询、插入与状态更新接口
"""
import json
from flask import jsonify, request
from src.db_manager.database import DatabaseManager
from src.db_manager.manager import LentModel


def _normalize_json_text(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return None


class LentHandler:

    @staticmethod
    def count_data(data_user):
        """统计指定用户的 IGXE 租出订单数量"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT COUNT(*) FROM lent WHERE data_user = ? AND "from" = ?',
                (data_user, 'igxe'),
            )
            count = rows[0][0] if rows else 0
            return jsonify({"count": int(count or 0)}), 200
        except Exception as e:
            print(f"统计IGXE租出订单数量失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"count": 0}), 500

    @staticmethod
    def get_latest_data(data_user):
        """获取指定用户最新的 IGXE 租出订单数据"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT ID, lean_start_time FROM lent '
                'WHERE data_user = ? AND "from" = ? '
                'ORDER BY lean_start_time DESC LIMIT 1',
                (data_user, 'igxe'),
            )
            if rows:
                return jsonify({"ID": rows[0][0], "order_time": rows[0][1]}), 200
            return jsonify({"ID": None, "order_time": None}), 200
        except Exception as e:
            print(f"获取最新IGXE租出数据失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"ID": None, "order_time": None}), 500

    @staticmethod
    def select_not_end(data_user):
        """查询 IGXE 平台未结束的租出订单 ID 列表"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT ID FROM lent '
                'WHERE data_user = ? AND "from" = ? '
                "AND status NOT IN ('已完成', '已取消')",
                (data_user, 'igxe'),
            )
            not_end_orders = [row[0] for row in rows] if rows else []
            return jsonify({"not_end_orders": not_end_orders}), 200
        except Exception as e:
            print(f"查询IGXE未结束租出订单失败: {e}")
            return jsonify({"not_end_orders": []}), 500

    @staticmethod
    def insert_db():
        """插入 IGXE 租出订单数据到 lent 表"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "无效的JSON数据"}), 400

            order_id = str(data.get('order_id') or '').strip()
            if not order_id:
                return jsonify({"success": False, "error": "缺少 order_id"}), 400

            market_hash_name = data.get('market_hash_name')
            img_url = data.get('img_url')
            steam_hash_name = market_hash_name if market_hash_name else (img_url if img_url else None)

            lent_data = {
                'ID': order_id,
                'weapon_name': data.get('weaponitem_name'),
                'weapon_type': data.get('weapon_type'),
                'item_name': data.get('item_name'),
                'steam_hash_name': steam_hash_name,
                'sticker': _normalize_json_text(data.get('sticker')),
                'pendant': _normalize_json_text(data.get('pendant')),
                'rename': data.get('rename'),
                'weapon_float': data.get('weapon_float'),
                'float_range': data.get('float_range'),
                'price': data.get('rent_unit_price'),
                'total_Lease_Days': data.get('total_lease_days'),
                'max_Lease_Days': data.get('max_lease_days'),
                'lean_start_time': data.get('rent_start_time'),
                'lean_end_time': data.get('rent_end_time'),
                'lenter_name': data.get('lenter_id'),
                'from': 'igxe',
                'status': data.get('state'),
                'status_sub': data.get('state_sub'),
                'last_status': data.get('state_sub'),
                'steam_id': data.get('lenter_id'),
                'data_user': data.get('data_user'),
            }

            lent_model = LentModel(**lent_data)
            if lent_model.save():
                return jsonify({"success": True, "message": "IGXE租出数据插入成功"}), 200
            return jsonify({"success": False, "error": "数据插入失败"}), 500

        except Exception as e:
            print(f"插入IGXE租出数据失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500

    @staticmethod
    def update_order_status():
        """更新 IGXE 租出订单状态"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "无效的JSON数据"}), 400

            order_id = str(data.get('order_id') or '').strip()
            if not order_id:
                return jsonify({"success": False, "error": "缺少 order_id"}), 400

            records = LentModel.find_all('ID = ? AND "from" = ?', (order_id, 'igxe'))
            if not records:
                return jsonify({"success": False, "error": "未找到对应的IGXE租出订单"}), 404

            for record in records:
                record.status = data.get('state')
                record.status_sub = data.get('state_sub')
                record.last_status = data.get('state_sub')
                record.save()

            return jsonify({"success": True, "message": "更新成功"}), 200
        except Exception as e:
            print(f"更新IGXE租出订单状态失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500
