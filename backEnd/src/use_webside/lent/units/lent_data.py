"""
Lent 页面数据查询模块
提供出租记录的筛选查询、时间范围搜索、类型磨损搜索
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager


class LentData:

    @staticmethod
    def _build_filter_clauses(filters):
        """构建租赁过滤条件的SQL子句和参数"""
        clauses = []
        params = []

        def add_clause(clause, *values):
            clauses.append(clause)
            params.extend(values)

        status = filters.get('status')
        if status and status != 'all':
            add_clause("status = ?", status)

        status_sub = filters.get('status_sub')
        if status_sub and status_sub != 'all':
            add_clause("last_status = ?", status_sub)

        platform = filters.get('platform')
        if platform and platform != 'all':
            add_clause('"from" = ?', platform)

        lenter_name = filters.get('lenter_name')
        if lenter_name:
            add_clause("lenter_name = ?", lenter_name)

        weapon_types = filters.get('weapon_types') or []
        if isinstance(weapon_types, list) and len(weapon_types) > 0:
            placeholders = ",".join(["?"] * len(weapon_types))
            clauses.append(f"weapon_type IN ({placeholders})")
            params.extend(weapon_types)

        float_ranges = filters.get('float_ranges') or []
        if isinstance(float_ranges, list) and len(float_ranges) > 0:
            placeholders = ",".join(["?"] * len(float_ranges))
            clauses.append(f"float_range IN ({placeholders})")
            params.extend(float_ranges)

        search_keyword = filters.get('search')
        if search_keyword:
            like = f"%{search_keyword}%"
            clauses.append("(item_name LIKE ? OR weapon_name LIKE ?)")
            params.extend([like, like])

        start_date = filters.get('start_date')
        end_date = filters.get('end_date')
        if start_date and end_date:
            clauses.append("lean_start_time BETWEEN ? AND ?")
            params.extend([f"{start_date} 00:00:00", f"{end_date} 23:59:59"])

        where_clause = ""
        if clauses:
            where_clause = " WHERE " + " AND ".join(clauses)

        return where_clause, tuple(params)

    @staticmethod
    def get_lent_data(min, max):
        """分页获取全部出租数据"""
        try:
            sql = """
            SELECT
                ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,
                lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
            FROM lent
            ORDER BY lean_start_time DESC
            LIMIT ? OFFSET ?
            """
            db = DatabaseManager()
            result = db.execute_query(sql, (max, min))
            if result:
                return jsonify(result), 200
            return jsonify([]), 200
        except Exception as e:
            print(f"获取出租数据失败: {e}")
            return jsonify([]), 500

    @staticmethod
    def get_lent_data_by_status(status, min, max):
        """按状态分页获取出租数据"""
        try:
            if status == 'all':
                sql = """
                SELECT
                    ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,
                    lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                    total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
                FROM lent
                ORDER BY lean_start_time DESC
                LIMIT ? OFFSET ?
                """
                params = (max, min)
            else:
                sql = """
                SELECT
                    ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,
                    lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                    total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
                FROM lent
                WHERE status = ?
                ORDER BY lean_start_time DESC
                LIMIT ? OFFSET ?
                """
                params = (status, max, min)

            db = DatabaseManager()
            result = db.execute_query(sql, params)
            if result:
                return jsonify(result), 200
            return jsonify([]), 200
        except Exception as e:
            print(f"按状态获取出租数据失败: {e}")
            return jsonify([]), 500

    @staticmethod
    def get_lent_data_by_status_sub(last_status, min, max):
        """按子状态分页获取出租数据"""
        try:
            if last_status == 'all':
                sql = """
                SELECT
                    ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,
                    lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                    total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
                FROM lent
                WHERE last_status IS NOT NULL AND last_status != ''
                ORDER BY lean_start_time DESC
                LIMIT ? OFFSET ?
                """
                params = (max, min)
            else:
                sql = """
                SELECT
                    ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,
                    lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                    total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
                FROM lent
                WHERE last_status = ?
                ORDER BY lean_start_time DESC
                LIMIT ? OFFSET ?
                """
                params = (last_status, max, min)

            db = DatabaseManager()
            result = db.execute_query(sql, params)
            if result:
                return jsonify(result), 200
            return jsonify([]), 200
        except Exception as e:
            print(f"按子状态获取出租数据失败: {e}")
            return jsonify([]), 500

    @staticmethod
    def get_lent_data_filtered():
        """组合查询接口：支持所有过滤条件的分页数据获取（查询统一 lent 表）"""
        try:
            data = request.get_json() or {}
            filters = data.get('filters', {})
            min_offset = data.get('min', 0)
            max_limit = data.get('max', 20)

            where_clause, params = LentData._build_filter_clauses(filters)

            # 统一 20 列格式。此前误查 yyyp_lent（悠悠专用表），导致其它平台
            # （如 IGXE）的记录永远筛不出来；lent 是含全部平台的统一表。
            sql = f"""
            SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range,
                   price, lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                   total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
            FROM lent
            {where_clause}
            ORDER BY lean_start_time DESC
            LIMIT {max_limit} OFFSET {min_offset}
            """

            db = DatabaseManager()
            result = db.execute_query(sql, params)

            if result:
                return jsonify(result), 200
            return jsonify([]), 200
        except Exception as e:
            print(f"获取出租筛选数据失败: {e}")
            return jsonify({"success": False, "message": str(e)}), 500

    @staticmethod
    def search_lent_by_time_range(start_date, end_date):
        """按时间范围搜索出租记录（全量返回）"""
        try:
            sql = """
            SELECT
                ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,
                lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
            FROM lent
            WHERE lean_start_time BETWEEN ? AND ?
            ORDER BY lean_start_time DESC
            """
            params = (f"{start_date} 00:00:00", f"{end_date} 23:59:59")
            db = DatabaseManager()
            result = db.execute_query(sql, params)
            return jsonify(result or []), 200
        except Exception as e:
            print(f"按时间范围查询出租失败: {e}")
            return jsonify([]), 500

    @staticmethod
    def search_by_type_and_wear():
        """根据类型和磨损等级搜索出租记录（支持多选）"""
        try:
            data = request.get_json() or {}
            weapon_types = data.get('weapon_type', [])
            float_ranges = data.get('float_range', [])
            page = max(int(data.get('page', 1)), 1)
            page_size = max(int(data.get('page_size', 20)), 1)

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

            if not conditions:
                return jsonify({
                    'success': True,
                    'data': [],
                    'total': 0,
                    'page': page,
                    'page_size': page_size
                }), 200

            where_clause = " AND ".join(conditions)
            offset = (page - 1) * page_size

            db = DatabaseManager()

            # 获取总数
            count_sql = f"SELECT COUNT(*) FROM lent WHERE {where_clause}"
            count_result = db.execute_query(count_sql, tuple(params))
            total = count_result[0][0] if count_result else 0

            # 统一 20 列格式
            data_sql = f"""
            SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range,
                   price, lenter_name, status, last_status, "from", lean_start_time, lean_end_time,
                   total_Lease_Days, max_Lease_Days, steam_hash_name, sticker, pendant, rename, data_user
            FROM lent
            WHERE {where_clause}
            ORDER BY lean_start_time DESC
            LIMIT ? OFFSET ?
            """
            params.extend([page_size, offset])
            data_result = db.execute_query(data_sql, tuple(params))

            return jsonify({
                'success': True,
                'data': data_result or [],
                'total': total,
                'page': page,
                'page_size': page_size
            }), 200

        except Exception as e:
            print(f"按类型和磨损等级搜索失败: {e}")
            return jsonify({
                'success': False,
                'message': str(e),
                'data': [],
                'total': 0
            }), 500
