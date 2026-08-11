"""
IGXE sell 查询模块
提供 Spider 所需的出售记录查询接口
"""
from flask import jsonify
from src.db_manager.database import DatabaseManager
from src.db_manager.index.model.sell import SellModel


class SellQuery:
    @staticmethod
    def count_data(user_id):
        """统计指定用户 IGXE 平台出售记录数量（按主订单号去重，与列表分页粒度一致）"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT COUNT(DISTINCT ID_sub) FROM sell WHERE data_user = ? AND "from" = ?',
                (user_id, "igxe"),
            )
            count = rows[0][0] if rows else 0
            return jsonify({"count": int(count or 0)}), 200
        except Exception as exc:
            print(f"统计 IGXE 出售数据失败: {exc}")
            return jsonify({"count": 0}), 500

    @staticmethod
    def get_latest_data(user_id):
        """获取指定用户 IGXE 平台最新一条出售记录（主订单号和订单时间）"""
        try:
            records = SellModel.find_all(
                'data_user = ? AND "from" = \'igxe\' ORDER BY order_time DESC',
                (user_id,),
                limit=1
            )
            if records and len(records) > 0:
                latest_record = records[0]
                return jsonify({
                    "ID": latest_record.ID,
                    "ID_sub": latest_record.ID_sub,
                    "order_time": latest_record.order_time
                }), 200
            return jsonify({"ID": None, "ID_sub": None, "order_time": None}), 200
        except Exception as exc:
            print(f"获取最新 IGXE 出售数据失败: {exc}")
            import traceback
            print(traceback.format_exc())
            return jsonify({"ID": None, "ID_sub": None, "order_time": None}), 500

    @staticmethod
    def select_not_end(user_id):
        """查询 IGXE 平台未完成的出售主订单号列表"""
        try:
            db = DatabaseManager()
            rows = db.execute_query(
                'SELECT DISTINCT ID_sub FROM sell '
                'WHERE data_user = ? AND "from" = ? '
                "AND status NOT IN ('已完成', '已取消') "
                "AND ID_sub IS NOT NULL AND TRIM(ID_sub) != ''",
                (user_id, "igxe"),
            )
            not_end_orders = [row[0] for row in rows] if rows else []
            return jsonify({"not_end_orders": not_end_orders}), 200
        except Exception as exc:
            print(f"查询 IGXE 未完成出售订单失败: {exc}")
            return jsonify({"not_end_orders": []}), 500
