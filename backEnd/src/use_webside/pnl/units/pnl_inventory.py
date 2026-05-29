"""
库存盈亏(未实现)接口
- 读取 steam_inventory(if_inventory=1) 与 steam_stockComponents 的成本/市值
- 每天为每个账号写入一条快照(pnl_inventory_daily),与已实现配对盈亏分开
- 日历按天聚合,盈亏 = 选定平台市值合计 - 成本合计
"""
from datetime import datetime

from flask import jsonify, request
from src.db_manager.database import DatabaseManager


def _now_iso():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _today():
    return datetime.now().strftime('%Y-%m-%d')


def _account_list(db):
    """库存或组件中出现过的账号集合"""
    rows = db.execute_query(
        """
        SELECT DISTINCT data_user FROM (
            SELECT data_user FROM steam_inventory
            WHERE data_user IS NOT NULL AND data_user != '' AND if_inventory = '1'
            UNION
            SELECT data_user FROM steam_stockComponents
            WHERE data_user IS NOT NULL AND data_user != ''
        )
        """,
        ()
    )
    return [r[0] for r in rows if r and r[0]]


def _inv_totals(db, data_user):
    """库存(steam_inventory, if_inventory=1)的件数与成本/各平台市值合计"""
    row = db.execute_query(
        """
        SELECT COUNT(*),
               COALESCE(SUM(CAST(buy_price   AS REAL)), 0),
               COALESCE(SUM(CAST(yyyp_price  AS REAL)), 0),
               COALESCE(SUM(CAST(buff_price  AS REAL)), 0),
               COALESCE(SUM(CAST(steam_price AS REAL)), 0)
        FROM steam_inventory
        WHERE data_user = ? AND if_inventory = '1'
        """,
        (data_user,)
    )
    r = row[0] if row else (0, 0, 0, 0, 0)
    return {
        'count': int(r[0] or 0),
        'cost': float(r[1] or 0), 'yyyp': float(r[2] or 0),
        'buff': float(r[3] or 0), 'steam': float(r[4] or 0),
    }


def _comp_totals(db, data_user):
    """在库组件(steam_stockComponents)的件数与成本/各平台市值合计"""
    row = db.execute_query(
        """
        SELECT COUNT(*),
               COALESCE(SUM(CAST(buy_price   AS REAL)), 0),
               COALESCE(SUM(CAST(yyyp_price  AS REAL)), 0),
               COALESCE(SUM(CAST(buff_price  AS REAL)), 0),
               COALESCE(SUM(CAST(steam_price AS REAL)), 0)
        FROM steam_stockComponents
        WHERE data_user = ?
        """,
        (data_user,)
    )
    r = row[0] if row else (0, 0, 0, 0, 0)
    return {
        'count': int(r[0] or 0),
        'cost': float(r[1] or 0), 'yyyp': float(r[2] or 0),
        'buff': float(r[3] or 0), 'steam': float(r[4] or 0),
    }


def record_inventory_snapshot(snapshot_date=None, data_user=None):
    """
    记录指定日期(默认今天)的库存盈亏快照。
    data_user 为空则对所有账号各记一条;每个账号当天仅一条(已存在则覆盖)。
    返回 { date, accounts }
    """
    db = DatabaseManager()
    snapshot_date = snapshot_date or _today()
    users = [data_user] if data_user else _account_list(db)
    now = _now_iso()
    n = 0
    for u in users:
        inv = _inv_totals(db, u)
        comp = _comp_totals(db, u)
        existing = db.execute_query(
            "SELECT id FROM pnl_inventory_daily WHERE snapshot_date = ? AND data_user = ?",
            (snapshot_date, u)
        )
        if existing:
            db.execute_update(
                """
                UPDATE pnl_inventory_daily SET
                    inv_count = ?, inv_cost = ?, inv_yyyp = ?, inv_buff = ?, inv_steam = ?,
                    comp_count = ?, comp_cost = ?, comp_yyyp = ?, comp_buff = ?, comp_steam = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    inv['count'], inv['cost'], inv['yyyp'], inv['buff'], inv['steam'],
                    comp['count'], comp['cost'], comp['yyyp'], comp['buff'], comp['steam'],
                    now, existing[0][0],
                )
            )
        else:
            db.execute_insert(
                """
                INSERT INTO pnl_inventory_daily (
                    snapshot_date, data_user,
                    inv_count, inv_cost, inv_yyyp, inv_buff, inv_steam,
                    comp_count, comp_cost, comp_yyyp, comp_buff, comp_steam,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot_date, u,
                    inv['count'], inv['cost'], inv['yyyp'], inv['buff'], inv['steam'],
                    comp['count'], comp['cost'], comp['yyyp'], comp['buff'], comp['steam'],
                    now, now,
                )
            )
        n += 1
    return {'date': snapshot_date, 'accounts': n}


class PnlInventory:

    @staticmethod
    def record_snapshot():
        """
        记录今日(或指定日期)库存盈亏快照
        Request JSON: { data_user?, date? }
        """
        try:
            data = request.get_json(silent=True) or {}
            result = record_inventory_snapshot(
                snapshot_date=data.get('date'),
                data_user=data.get('data_user'),
            )
            return jsonify({'success': True, 'data': result}), 200
        except Exception as e:
            print(f"库存盈亏快照失败: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    def get_inventory_calendar():
        """
        库存盈亏日历:按快照日期聚合(库存 + 组件合计)
        相比"上一个快照日"的市值涨跌百分比(*_change_pct),跨月/跨空缺日仍取真实上一快照
        Request JSON: { start_date, end_date, data_user? }
        Response: [{ date, count, cost, yyyp, buff, steam,
                     yyyp_profit, buff_profit, steam_profit,
                     yyyp_change_pct, buff_change_pct, steam_change_pct }]
        """
        try:
            data = request.get_json() or {}
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            data_user = data.get('data_user')
            if not start_date or not end_date:
                return jsonify({'success': False, 'message': 'start_date / end_date 必填'}), 400

            # CTE 在"全部历史"上按日聚合并用 LAG 取上一快照日的市值,
            # 外层再过滤到请求区间 —— 这样区间首日也能拿到区间外的上一日做对比
            user_clause = " WHERE data_user = ?" if data_user else ""
            sql = f"""
            WITH daily AS (
                SELECT snapshot_date AS d,
                       SUM(inv_count + comp_count) AS cnt,
                       SUM(inv_cost  + comp_cost)  AS cost,
                       SUM(inv_yyyp  + comp_yyyp)  AS yyyp,
                       SUM(inv_buff  + comp_buff)  AS buff,
                       SUM(inv_steam + comp_steam) AS steam
                FROM pnl_inventory_daily
                {user_clause}
                GROUP BY snapshot_date
            ),
            withprev AS (
                SELECT d, cnt, cost, yyyp, buff, steam,
                       LAG(yyyp)  OVER (ORDER BY d) AS prev_yyyp,
                       LAG(buff)  OVER (ORDER BY d) AS prev_buff,
                       LAG(steam) OVER (ORDER BY d) AS prev_steam
                FROM daily
            )
            SELECT d, cnt, cost, yyyp, buff, steam, prev_yyyp, prev_buff, prev_steam
            FROM withprev
            WHERE d BETWEEN ? AND ?
            ORDER BY d
            """
            params = ([data_user] if data_user else []) + [start_date, end_date]

            db = DatabaseManager()
            rows = db.execute_query(sql, tuple(params))

            def pct(cur, prev):
                if prev is None:
                    return None
                prev = float(prev)
                if prev == 0:
                    return None
                return round((float(cur) - prev) / prev * 100, 2)

            result = []
            for r in rows:
                cost = float(r[2] or 0)
                yyyp = float(r[3] or 0)
                buff = float(r[4] or 0)
                steam = float(r[5] or 0)
                result.append({
                    'date': r[0],
                    'count': int(r[1] or 0),
                    'cost': round(cost, 2),
                    'yyyp': round(yyyp, 2),
                    'buff': round(buff, 2),
                    'steam': round(steam, 2),
                    'yyyp_profit': round(yyyp - cost, 2),
                    'buff_profit': round(buff - cost, 2),
                    'steam_profit': round(steam - cost, 2),
                    'yyyp_change_pct': pct(yyyp, r[6]),
                    'buff_change_pct': pct(buff, r[7]),
                    'steam_change_pct': pct(steam, r[8]),
                })
            return jsonify({'success': True, 'data': result}), 200
        except Exception as e:
            print(f"库存盈亏日历查询失败: {e}")
            return jsonify({'success': False, 'message': str(e), 'data': []}), 500
