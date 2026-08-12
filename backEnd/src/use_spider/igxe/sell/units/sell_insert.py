"""
IGXE sell 写入模块
仅写入 sell 表，使用 ID 记录单品号、ID_sub 记录主订单号（子订单归并）。
"""
import json
from flask import jsonify, request
from src.db_manager.index.model.sell import SellModel
from src.use_spider.igxe.hash_name import resolve_steam_hash_name


def _normalize_json_text(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return None


class SellInsert:
    @staticmethod
    def insert_db():
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "无效的JSON数据"}), 400

            item_id = str(data.get("item_id") or "").strip()
            if not item_id:
                return jsonify({"success": False, "error": "缺少 item_id"}), 400

            sell_record = SellModel()
            sell_record.ID = item_id
            sell_record.ID_sub = str(data.get("item_id_sub") or "").strip() or None
            sell_record.weapon_name = data.get("weaponitem_name")
            sell_record.weapon_type = data.get("weapon_type")
            sell_record.item_name = data.get("item_name")
            sell_record.weapon_float = data.get("weapon_float")
            sell_record.float_range = data.get("float_range")
            sell_record.price = data.get("price")
            sell_record.price_original = data.get("price_original")
            sell_record.buyer_name = data.get("buyer_id")
            sell_record.status = data.get("state")
            sell_record.order_time = data.get("created_at")
            sell_record.data_user = data.get("data_user")
            sell_record.status_sub = data.get("state_sub")
            sell_record.sticker = _normalize_json_text(data.get("sticker"))
            sell_record.pendant = _normalize_json_text(data.get("pendant"))
            sell_record.rename = data.get("rename")
            # 只存 Steam 市场名，绝不回退成图片 URL
            sell_record.steam_hash_name = resolve_steam_hash_name(
                data.get("market_hash_name"),
                data.get("weaponitem_name"),
                data.get("item_name"),
                data.get("weapon_float"),
            )
            sell_record.steam_id = data.get("buyer_id")
            sell_record.assetid = data.get("assetid")
            setattr(sell_record, "from", "igxe")

            saved = sell_record.save()
            if not saved:
                return jsonify({"success": False, "error": "数据插入失败"}), 500

            return jsonify(
                {
                    "success": True,
                    "message": "IGXE销售数据插入成功",
                    "data": {"id": sell_record.ID, "id_sub": sell_record.ID_sub},
                }
            ), 200
        except Exception as e:
            print(f"IGXE销售数据插入错误: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500

    @staticmethod
    def update_order_status():
        """更新 IGXE 出售订单状态（按主订单号 ID_sub 批量更新其下所有单品）"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "无效的JSON数据"}), 400

            item_id_sub = str(data.get("item_id_sub") or "").strip()
            if not item_id_sub:
                return jsonify({"success": False, "error": "缺少 item_id_sub"}), 400

            status = data.get("state")
            status_sub = data.get("state_sub")

            records = SellModel.find_all(
                'ID_sub = ? AND "from" = ?',
                (item_id_sub, "igxe"),
            )
            if not records:
                return jsonify({"success": False, "error": "未找到对应的IGXE出售订单"}), 404

            for record in records:
                record.status = status
                record.status_sub = status_sub
                record.save()

            return jsonify(
                {
                    "success": True,
                    "message": "更新成功",
                    "data": {"id_sub": item_id_sub, "count": len(records)},
                }
            ), 200
        except Exception as e:
            print(f"更新IGXE出售订单状态失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500
