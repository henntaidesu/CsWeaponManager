"""
盈亏数据查询接口
- 日历聚合 / 当日明细 / 孤立卖出 / 已剔除列表 / 总览统计 / 候选买入
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager

from .pnl_engine import COMPLETED_STATUS


class PnlData:

    @staticmethod
    def get_calendar():
        """
        日历聚合:按出售日期归集盈亏

        Request JSON:
            start_date, end_date: 'YYYY-MM-DD'
            data_user: 可选,限定账号
        Response:
            [{ date, profit, pair_count, paired_quantity, excluded_count }]
        """
        try:
            data = request.get_json() or {}
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            data_user = data.get('data_user')

            if not start_date or not end_date:
                return jsonify({'success': False, 'message': 'start_date / end_date 必填'}), 400

            sql = """
            SELECT DATE(sell_order_time) AS d,
                   SUM(CASE WHEN is_excluded = 0 THEN profit ELSE 0 END) AS profit,
                   SUM(CASE WHEN is_excluded = 0 THEN 1 ELSE 0 END) AS pair_count,
                   SUM(CASE WHEN is_excluded = 0 THEN quantity ELSE 0 END) AS paired_quantity,
                   SUM(CASE WHEN is_excluded = 1 THEN 1 ELSE 0 END) AS excluded_count
            FROM pnl_pairing
            WHERE sell_order_time IS NOT NULL
              AND DATE(sell_order_time) BETWEEN ? AND ?
            """
            params = [start_date, end_date]
            if data_user:
                sql += " AND data_user = ?"
                params.append(data_user)
            sql += " GROUP BY DATE(sell_order_time) ORDER BY d"

            db = DatabaseManager()
            rows = db.execute_query(sql, tuple(params))
            result = [
                {
                    'date': r[0],
                    'profit': round(float(r[1] or 0), 2),
                    'pair_count': int(r[2] or 0),
                    'paired_quantity': int(r[3] or 0),
                    'excluded_count': int(r[4] or 0),
                }
                for r in rows
            ]
            return jsonify({'success': True, 'data': result}), 200
        except Exception as e:
            print(f"日历数据查询失败: {e}")
            return jsonify({'success': False, 'message': str(e), 'data': []}), 500

    @staticmethod
    def get_overall_stats():
        """总览统计(用于头部卡片)"""
        try:
            data = request.get_json() or {}
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            data_user = data.get('data_user')
            include_excluded = bool(data.get('include_excluded', False))

            clauses = []
            params = []
            if start_date and end_date:
                clauses.append("DATE(sell_order_time) BETWEEN ? AND ?")
                params.extend([start_date, end_date])
            if data_user:
                clauses.append("data_user = ?")
                params.append(data_user)
            if not include_excluded:
                clauses.append("is_excluded = 0")

            where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

            sql = f"""
            SELECT
                COALESCE(SUM(profit), 0),
                COALESCE(SUM(quantity), 0),
                COUNT(*),
                COALESCE(SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN profit < 0 THEN profit ELSE 0 END), 0)
            FROM pnl_pairing
            {where}
            """
            db = DatabaseManager()
            row = db.execute_query(sql, tuple(params))
            if not row:
                return jsonify({'success': True, 'data': {}}), 200
            r = row[0]

            excluded_sql = "SELECT COUNT(*) FROM pnl_pairing WHERE is_excluded = 1"
            ex_params = []
            if data_user:
                excluded_sql += " AND data_user = ?"
                ex_params.append(data_user)
            if start_date and end_date:
                excluded_sql += " AND DATE(sell_order_time) BETWEEN ? AND ?"
                ex_params.extend([start_date, end_date])
            ex_row = db.execute_query(excluded_sql, tuple(ex_params))
            excluded_count = int(ex_row[0][0] or 0) if ex_row else 0

            return jsonify({
                'success': True,
                'data': {
                    'total_profit': round(float(r[0] or 0), 2),
                    'paired_quantity': int(r[1] or 0),
                    'pair_count': int(r[2] or 0),
                    'win_profit': round(float(r[3] or 0), 2),
                    'loss_profit': round(float(r[4] or 0), 2),
                    'excluded_count': excluded_count,
                }
            }), 200
        except Exception as e:
            print(f"总览统计查询失败: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    def get_daily_detail():
        """
        当日明细:列出该日所有配对(含已剔除)
        Request JSON: { date, data_user? }
        """
        try:
            data = request.get_json() or {}
            date = data.get('date')
            data_user = data.get('data_user')
            if not date:
                return jsonify({'success': False, 'message': 'date 必填'}), 400

            sql = """
            SELECT p.id, p.buy_id, p.buy_id_sub, p.buy_from,
                   p.sell_id, p.sell_id_sub,
                   p.data_user,
                   COALESCE(p.steam_hash_name, s.steam_hash_name, b.steam_hash_name) AS steam_hash_name,
                   p.quantity,
                   p.buy_price, p.sell_price, p.profit,
                   p.pair_type, p.is_excluded, p.exclude_reason,
                   p.sell_order_time, p.buy_order_time,
                   s.[from] AS sell_from,
                   COALESCE(s.item_name, b.item_name) AS item_name,
                   COALESCE(s.weapon_name, b.weapon_name) AS weapon_name,
                   COALESCE(s.weapon_float, b.weapon_float) AS weapon_float,
                   COALESCE(s.float_range, b.float_range) AS float_range,
                   COALESCE(b.sticker, s.sticker) AS sticker,
                   COALESCE(b.pendant, s.pendant) AS pendant,
                   COALESCE(b.rename, s.rename) AS rename
            FROM pnl_pairing p
            LEFT JOIN sell s
              ON s.ID = p.sell_id
             AND (s.ID_sub IS p.sell_id_sub OR (s.ID_sub IS NULL AND p.sell_id_sub IS NULL))
            LEFT JOIN buy b
              ON b.ID = p.buy_id
             AND b.[from] = p.buy_from
             AND (b.ID_sub IS p.buy_id_sub OR (b.ID_sub IS NULL AND p.buy_id_sub IS NULL))
            WHERE DATE(p.sell_order_time) = ?
            """
            params = [date]
            if data_user:
                sql += " AND p.data_user = ?"
                params.append(data_user)
            sql += " ORDER BY p.sell_order_time DESC, p.id DESC"

            db = DatabaseManager()
            rows = db.execute_query(sql, tuple(params))
            data_list = []
            for r in rows:
                data_list.append({
                    'pairing_id': r[0],
                    'buy_id': r[1], 'buy_id_sub': r[2], 'buy_from': r[3],
                    'sell_id': r[4], 'sell_id_sub': r[5],
                    'data_user': r[6], 'steam_hash_name': r[7],
                    'quantity': int(r[8] or 0),
                    'buy_price': float(r[9] or 0),
                    'sell_price': float(r[10] or 0),
                    'profit': round(float(r[11] or 0), 2),
                    'pair_type': r[12],
                    'is_excluded': bool(r[13]),
                    'exclude_reason': r[14],
                    'sell_order_time': r[15],
                    'buy_order_time': r[16],
                    'sell_from': r[17],
                    'item_name': r[18], 'weapon_name': r[19],
                    'weapon_float': r[20], 'float_range': r[21],
                    'sticker': r[22], 'pendant': r[23], 'rename': r[24],
                })
            return jsonify({'success': True, 'data': data_list}), 200
        except Exception as e:
            print(f"当日明细查询失败: {e}")
            return jsonify({'success': False, 'message': str(e), 'data': []}), 500

    @staticmethod
    def get_orphan_sells():
        """
        孤立卖出:已完成但没有任何配对的 sell 记录
        分页 + 可选过滤 data_user / 时间范围 / 关键字
        """
        try:
            data = request.get_json() or {}
            data_user = data.get('data_user')
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            search = data.get('search')
            page = max(int(data.get('page', 1)), 1)
            page_size = max(int(data.get('page_size', 20)), 1)

            clauses = ["s.status = ?"]
            params: list = [COMPLETED_STATUS]
            clauses.append("NOT EXISTS (SELECT 1 FROM pnl_pairing p WHERE p.sell_id = s.ID AND (p.sell_id_sub IS s.ID_sub OR (p.sell_id_sub IS NULL AND s.ID_sub IS NULL)))")
            if data_user:
                clauses.append("s.data_user = ?")
                params.append(data_user)
            if start_date and end_date:
                clauses.append("s.order_time BETWEEN ? AND ?")
                params.extend([f"{start_date} 00:00:00", f"{end_date} 23:59:59"])
            if search:
                clauses.append("(s.item_name LIKE ? OR s.weapon_name LIKE ? OR s.steam_hash_name LIKE ?)")
                like = f"%{search}%"
                params.extend([like, like, like])

            where = "WHERE " + " AND ".join(clauses)
            db = DatabaseManager()
            count_row = db.execute_query(f"SELECT COUNT(*) FROM sell s {where}", tuple(params))
            total = int(count_row[0][0] or 0) if count_row else 0

            offset = (page - 1) * page_size
            list_sql = f"""
            SELECT s.ID, s.ID_sub, s.[from], s.item_name, s.weapon_name,
                   s.weapon_float, s.float_range, s.price, s.order_time,
                   s.steam_hash_name, s.data_user, s.status, s.status_sub,
                   s.sticker, s.pendant, s.rename
            FROM sell s
            {where}
            ORDER BY s.order_time DESC
            LIMIT ? OFFSET ?
            """
            rows = db.execute_query(list_sql, tuple(params) + (page_size, offset))
            records = [
                {
                    'sell_id': r[0], 'sell_id_sub': r[1], 'sell_from': r[2],
                    'item_name': r[3], 'weapon_name': r[4],
                    'weapon_float': r[5], 'float_range': r[6],
                    'sell_price': float(r[7] or 0),
                    'sell_order_time': r[8],
                    'steam_hash_name': r[9], 'data_user': r[10],
                    'status': r[11], 'status_sub': r[12],
                    'sticker': r[13], 'pendant': r[14], 'rename': r[15],
                }
                for r in rows
            ]
            return jsonify({
                'success': True, 'data': records,
                'total': total, 'page': page, 'page_size': page_size
            }), 200
        except Exception as e:
            print(f"孤立卖出查询失败: {e}")
            return jsonify({'success': False, 'message': str(e), 'data': [], 'total': 0}), 500

    @staticmethod
    def get_candidate_buys():
        """
        手动配对时,根据指定的 sell 找出可选的 buy 候选
        - 同 data_user + 同 steam_hash_name
        - buy 必须 status='已完成' 且 price 非空
        - 剩余数量 > 0
        """
        try:
            data = request.get_json() or {}
            sell_id = data.get('sell_id')
            sell_id_sub = data.get('sell_id_sub')
            relax_hash = bool(data.get('relax_hash', False))
            relax_user = bool(data.get('relax_user', False))

            if not sell_id:
                return jsonify({'success': False, 'message': 'sell_id 必填'}), 400

            db = DatabaseManager()
            sell_rows = db.execute_query(
                """
                SELECT data_user, steam_hash_name, item_name
                FROM sell
                WHERE ID = ?
                  AND (ID_sub IS ? OR (ID_sub IS NULL AND ? IS NULL))
                LIMIT 1
                """,
                (sell_id, sell_id_sub, sell_id_sub)
            )
            if not sell_rows:
                return jsonify({'success': False, 'message': '未找到该出售记录'}), 404
            data_user, steam_hash_name, item_name = sell_rows[0]

            clauses = ["b.status = ?", "b.price IS NOT NULL"]
            params: list = [COMPLETED_STATUS]
            if not relax_user and data_user:
                clauses.append("b.data_user = ?")
                params.append(data_user)
            if not relax_hash and steam_hash_name:
                clauses.append("b.steam_hash_name = ?")
                params.append(steam_hash_name)
            elif item_name:
                clauses.append("b.item_name = ?")
                params.append(item_name)

            where = "WHERE " + " AND ".join(clauses)

            sql = f"""
            SELECT b.ID, b.ID_sub, b.[from], b.item_name, b.weapon_name,
                   b.weapon_float, b.float_range, b.price, b.order_time,
                   b.steam_hash_name, b.data_user,
                   COALESCE(b.buy_number, 1) AS qty,
                   COALESCE((
                       SELECT SUM(p.quantity) FROM pnl_pairing p
                       WHERE p.buy_id = b.ID AND p.buy_from = b.[from]
                         AND (p.buy_id_sub IS b.ID_sub OR (p.buy_id_sub IS NULL AND b.ID_sub IS NULL))
                   ), 0) AS used
            FROM buy b
            {where}
            ORDER BY b.order_time ASC
            LIMIT 200
            """
            rows = db.execute_query(sql, tuple(params))
            records = []
            for r in rows:
                qty = int(r[11] or 1)
                used = int(r[12] or 0)
                remaining = qty - used
                if remaining <= 0:
                    continue
                records.append({
                    'buy_id': r[0], 'buy_id_sub': r[1], 'buy_from': r[2],
                    'item_name': r[3], 'weapon_name': r[4],
                    'weapon_float': r[5], 'float_range': r[6],
                    'buy_price': float(r[7] or 0),
                    'buy_order_time': r[8],
                    'steam_hash_name': r[9], 'data_user': r[10],
                    'qty': qty, 'used': used, 'remaining': remaining,
                })
            return jsonify({'success': True, 'data': records}), 200
        except Exception as e:
            print(f"候选买入查询失败: {e}")
            return jsonify({'success': False, 'message': str(e), 'data': []}), 500

    @staticmethod
    def get_month_range():
        """
        日历月份下拉范围:返回 pnl_pairing 中最老/最新的月份(YYYY-MM)
        Request JSON: { data_user? }
        Response: { min_month, max_month }  无数据时为 None
        """
        try:
            data = request.get_json(silent=True) or {}
            data_user = data.get('data_user')

            sql = """
            SELECT MIN(DATE(sell_order_time)), MAX(DATE(sell_order_time))
            FROM pnl_pairing
            WHERE sell_order_time IS NOT NULL
            """
            params = []
            if data_user:
                sql += " AND data_user = ?"
                params.append(data_user)

            db = DatabaseManager()
            row = db.execute_query(sql, tuple(params))
            min_date = row[0][0] if row and row[0] else None
            max_date = row[0][1] if row and row[0] else None
            return jsonify({
                'success': True,
                'data': {
                    'min_month': min_date[:7] if min_date else None,
                    'max_month': max_date[:7] if max_date else None,
                }
            }), 200
        except Exception as e:
            print(f"月份范围查询失败: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    def get_data_user_list():
        """配对数据涉及到的 data_user 列表(buy ∪ sell)"""
        try:
            sql = """
            SELECT DISTINCT data_user FROM (
                SELECT data_user FROM buy WHERE data_user IS NOT NULL AND data_user != ''
                UNION
                SELECT data_user FROM sell WHERE data_user IS NOT NULL AND data_user != ''
            )
            ORDER BY data_user
            """
            db = DatabaseManager()
            rows = db.execute_query(sql, ())
            users = [r[0] for r in rows if r and r[0]]
            return jsonify({'success': True, 'data': users}), 200
        except Exception as e:
            print(f"data_user 列表查询失败: {e}")
            return jsonify({'success': False, 'data': [], 'message': str(e)}), 500
