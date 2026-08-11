"""
IGXE message 处理模块
提供 Spider 所需的消息查询与写入接口
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager
from src.db_manager.igxe.model import IgxeMessageboxModel


def _build_record(item, data_user):
    """把 Spider 传来的单条消息组装成模型实例，缺少 message_id 返回 None"""
    message_id = str(item.get('message_id') or '').strip()
    if not message_id:
        return None

    record = IgxeMessageboxModel()
    record.message_id = message_id
    record.category = item.get('category')
    record.title = item.get('title')
    record.content = item.get('content')
    record.biz_id = item.get('biz_id')
    record.biz_type = item.get('biz_type')
    record.product_id = item.get('product_id')
    record.app_id = item.get('app_id')
    record.url = item.get('url')
    record.is_read = item.get('is_read') or 0
    record.createTime = item.get('created')
    record.data_user = item.get('data_user') or data_user
    return record


class MessageHandler:

    @staticmethod
    def get_latest(user_id):
        """获取指定用户最新一条 IGXE 消息（供 Spider 判断增量起点）"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT message_id, createTime FROM igxe_messagebox '
                'WHERE data_user = ? ORDER BY createTime DESC LIMIT 1',
                (user_id,),
            )
            if rows:
                return jsonify({"message_id": rows[0][0], "createTime": rows[0][1]}), 200
            return jsonify({"message_id": None, "createTime": None}), 200
        except Exception as e:
            print(f"获取最新IGXE消息失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"message_id": None, "createTime": None}), 500

    @staticmethod
    def insert_db():
        """插入单条 IGXE 消息"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "无效的JSON数据"}), 400

            record = _build_record(data, data.get('data_user'))
            if record is None:
                return jsonify({"success": False, "error": "缺少 message_id"}), 400

            if record.save():
                return jsonify({"success": True, "message": "IGXE消息写入成功"}), 200
            return jsonify({"success": False, "error": "数据插入失败"}), 500
        except Exception as e:
            print(f"插入IGXE消息失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500

    @staticmethod
    def batch_insert():
        """批量插入 IGXE 消息

        请求体: {"data_user": "...", "messages": [ {...}, {...} ]}
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "无效的JSON数据"}), 400

            messages = data.get('messages') or []
            if not isinstance(messages, list):
                return jsonify({"success": False, "error": "messages 必须是数组"}), 400

            data_user = data.get('data_user')
            saved = 0
            for item in messages:
                if not isinstance(item, dict):
                    continue
                record = _build_record(item, data_user)
                if record is not None and record.save():
                    saved += 1

            return jsonify({
                "success": True,
                "message": f"IGXE消息写入完成，共 {saved}/{len(messages)} 条",
                "data": {"saved": saved, "total": len(messages)}
            }), 200
        except Exception as e:
            print(f"批量插入IGXE消息失败: {e}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"success": False, "error": str(e)}), 500
