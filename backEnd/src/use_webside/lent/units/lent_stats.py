"""
Lent 页面统计模块
提供出租记录的统计信息（总数、总金额、平均价格、租赁天数、状态分布等）
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager
from .lent_data import LentData


class LentStats:

    @staticmethod
    def get_lent_stats_filtered():
        """组合查询接口：支持所有过滤条件的统计信息获取（查询 yyyp_lent 表）"""
        try:
            filters = request.get_json() or {}
            where_clause, params = LentData._build_filter_clauses(filters)

            sql = f"""
            SELECT
                COUNT(*) as total_count,
                COALESCE(SUM(price * total_Lease_Days), 0) as total_amount,
                COALESCE(AVG(price), 0) as avg_price,
                COALESCE(SUM(total_Lease_Days), 0) as total_lease_days,
                COALESCE(AVG(total_Lease_Days), 0) as avg_lease_days,
                COUNT(CASE WHEN status = '租赁中' THEN 1 END) as renting_count,
                COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count
            FROM lent
            {where_clause}
            """

            db = DatabaseManager()
            result = db.execute_query(sql, params)

            if result and len(result) > 0:
                stats = result[0]
                return jsonify({
                    "success": True,
                    "totalCount": stats[0],
                    "totalAmount": round(float(stats[1]), 2),
                    "avgPrice": round(float(stats[2]), 2),
                    "totalLeaseDays": stats[3],
                    "avgLeaseDays": round(float(stats[4]), 2),
                    "rentingCount": stats[5],
                    "completedCount": stats[6],
                    "cancelledCount": stats[7]
                }), 200

            return jsonify({
                "success": True,
                "totalCount": 0,
                "totalAmount": 0.0,
                "avgPrice": 0.0,
                "totalLeaseDays": 0,
                "avgLeaseDays": 0.0,
                "rentingCount": 0,
                "completedCount": 0,
                "cancelledCount": 0
            }), 200
        except Exception as e:
            print(f"获取出租筛选统计失败: {e}")
            return jsonify({"success": False, "message": str(e)}), 500

    @staticmethod
    def get_lent_stats_by_time_range(start_date, end_date):
        """按时间范围获取出租统计"""
        try:
            sql = """
            SELECT
                COUNT(*) as total_count,
                COALESCE(SUM(price * total_Lease_Days), 0) as total_amount,
                COALESCE(AVG(price), 0) as avg_price,
                COALESCE(SUM(total_Lease_Days), 0) as total_lease_days,
                COALESCE(AVG(total_Lease_Days), 0) as avg_lease_days,
                COUNT(CASE WHEN status = '租赁中' THEN 1 END) as renting_count,
                COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count
            FROM lent
            WHERE lean_start_time BETWEEN ? AND ?
            """
            params = (f"{start_date} 00:00:00", f"{end_date} 23:59:59")
            db = DatabaseManager()
            result = db.execute_query(sql, params)

            if result and len(result) > 0:
                stats = result[0]
                return jsonify({
                    "total_count": stats[0],
                    "total_amount": round(float(stats[1]), 2),
                    "avg_price": round(float(stats[2]), 2),
                    "total_lease_days": stats[3],
                    "avg_lease_days": round(float(stats[4]), 1),
                    "renting_count": stats[5],
                    "completed_count": stats[6],
                    "cancelled_count": stats[7]
                }), 200

            return jsonify({
                "total_count": 0,
                "total_amount": 0.0,
                "avg_price": 0.0,
                "total_lease_days": 0,
                "avg_lease_days": 0.0,
                "renting_count": 0,
                "completed_count": 0,
                "cancelled_count": 0
            }), 200
        except Exception as e:
            print(f"获取出租时间范围统计失败: {e}")
            return jsonify({"success": False, "message": str(e)}), 500

    @staticmethod
    def get_stats_by_type_and_wear():
        """获取按类型和磨损等级筛选的统计数据（查询 yyyp_lent 表）"""
        try:
            data = request.get_json() or {}
            weapon_types = data.get('weapon_type', [])
            float_ranges = data.get('float_range', [])

            if isinstance(weapon_types, str):
                weapon_types = [weapon_types]
            if isinstance(float_ranges, str):
                float_ranges = [float_ranges]

            conditions = []
            params = []

            if weapon_types:
                placeholders = ','.join(['?' for _ in weapon_types])
                conditions.append(f"weapon_type IN ({placeholders})")
                params.extend(weapon_types)

            if float_ranges:
                placeholders = ','.join(['?' for _ in float_ranges])
                conditions.append(f"float_range IN ({placeholders})")
                params.extend(float_ranges)

            where_clause = ""
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)

            db = DatabaseManager()

            sql = f"""
            SELECT
                COUNT(*) as total_count,
                COALESCE(SUM(price * total_Lease_Days), 0) as total_amount,
                COALESCE(AVG(price), 0) as avg_price,
                COALESCE(SUM(total_Lease_Days), 0) as total_lease_days,
                COALESCE(AVG(total_Lease_Days), 0) as avg_lease_days,
                COUNT(CASE WHEN status = '租赁中' THEN 1 END) as renting_count,
                COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count
            FROM lent
            {where_clause}
            """

            result = db.execute_query(sql, tuple(params)) or []

            if result:
                row = result[0]
                stats = {
                    'totalCount': row[0],
                    'totalAmount': round(row[1], 2),
                    'avgPrice': round(row[2], 2),
                    'totalLeaseDays': row[3],
                    'avgLeaseDays': round(row[4], 2),
                    'rentingCount': row[5],
                    'completedCount': row[6],
                    'cancelledCount': row[7]
                }
            else:
                stats = {
                    'totalCount': 0,
                    'totalAmount': 0,
                    'avgPrice': 0,
                    'totalLeaseDays': 0,
                    'avgLeaseDays': 0,
                    'rentingCount': 0,
                    'completedCount': 0,
                    'cancelledCount': 0
                }

            return jsonify({
                'success': True,
                'data': stats
            }), 200

        except Exception as e:
            print(f"获取统计数据失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': {}
            }), 500
