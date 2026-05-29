"""
盈亏配对引擎
- 自动配对:对每个 (data_user, steam_hash_name) 分组,按时间 FIFO 配对已完成的买卖
- 手动配对:在自动配对错配时手工指定一对买卖
- 剔除:把某对配对从统计中拿掉(例如导Steam余额的物品)
- 解绑:撤销某对配对,释放数量

约定:
- 仅纳入 status = '已完成' 的买卖记录
- buy 的可用数量 = COALESCE(buy_number, 1) - 已被非剔除配对消化的数量
- sell 的可用数量 = 1 - 已被非剔除配对消化的数量(sell 每行视为 1 件)
- 跨平台允许(只看 data_user)
- 实收口径:sell.price 即为实收;profit = (sell.price - buy.price) * quantity
"""
from typing import Optional, Dict, Any, List, Tuple
from src.db_manager.database import DatabaseManager


COMPLETED_STATUS = '已完成'

# 手动录入购入价(无买入记录)时的哨兵值 — buy_id / buy_from 为 NOT NULL
MANUAL_BUY_ID = 'MANUAL'
MANUAL_BUY_FROM = 'manual'


def _now_iso() -> str:
    from datetime import datetime
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _fetch_buys(db: DatabaseManager, data_user: Optional[str], steam_hash_name: Optional[str]) -> List[Dict[str, Any]]:
    """
    取出有未配对余量的买入记录(只取已完成 + 有 steam_hash_name + 有 price)
    返回每行附带 remaining(剩余可配对件数)
    """
    sql = """
    SELECT b.ID, b.ID_sub, b.[from], b.steam_hash_name, b.data_user,
           b.price, b.order_time, b.item_name, b.weapon_name, b.weapon_float,
           COALESCE(b.buy_number, 1) AS qty,
           COALESCE((
               SELECT SUM(p.quantity) FROM pnl_pairing p
               WHERE p.buy_id = b.ID AND p.buy_from = b.[from]
                 AND (p.buy_id_sub IS b.ID_sub OR (p.buy_id_sub IS NULL AND b.ID_sub IS NULL))
           ), 0) AS used
    FROM buy b
    WHERE b.status = ?
      AND b.steam_hash_name IS NOT NULL AND b.steam_hash_name != ''
      AND b.price IS NOT NULL
    """
    params: List[Any] = [COMPLETED_STATUS]
    if data_user:
        sql += " AND b.data_user = ?"
        params.append(data_user)
    if steam_hash_name:
        sql += " AND b.steam_hash_name = ?"
        params.append(steam_hash_name)
    sql += " ORDER BY b.order_time ASC"

    rows = db.execute_query(sql, tuple(params))
    out: List[Dict[str, Any]] = []
    for r in rows:
        qty = int(r[10] or 1)
        used = int(r[11] or 0)
        remaining = qty - used
        if remaining <= 0:
            continue
        out.append({
            'ID': r[0], 'ID_sub': r[1], 'from': r[2],
            'steam_hash_name': r[3], 'data_user': r[4],
            'price': r[5], 'order_time': r[6],
            'item_name': r[7], 'weapon_name': r[8], 'weapon_float': r[9],
            'qty': qty, 'used': used, 'remaining': remaining,
        })
    return out


def _fetch_sells(db: DatabaseManager, data_user: Optional[str], steam_hash_name: Optional[str]) -> List[Dict[str, Any]]:
    """取出未配对的出售记录(每行视为 1 件)"""
    sql = """
    SELECT s.ID, s.ID_sub, s.[from], s.steam_hash_name, s.data_user,
           s.price, s.order_time, s.item_name, s.weapon_name, s.weapon_float,
           EXISTS(
               SELECT 1 FROM pnl_pairing p
               WHERE p.sell_id = s.ID
                 AND (p.sell_id_sub IS s.ID_sub OR (p.sell_id_sub IS NULL AND s.ID_sub IS NULL))
           ) AS already_paired
    FROM sell s
    WHERE s.status = ?
      AND s.steam_hash_name IS NOT NULL AND s.steam_hash_name != ''
      AND s.price IS NOT NULL
    """
    params: List[Any] = [COMPLETED_STATUS]
    if data_user:
        sql += " AND s.data_user = ?"
        params.append(data_user)
    if steam_hash_name:
        sql += " AND s.steam_hash_name = ?"
        params.append(steam_hash_name)
    sql += " ORDER BY s.order_time ASC"

    rows = db.execute_query(sql, tuple(params))
    out: List[Dict[str, Any]] = []
    for r in rows:
        if r[10]:
            continue
        out.append({
            'ID': r[0], 'ID_sub': r[1], 'from': r[2],
            'steam_hash_name': r[3], 'data_user': r[4],
            'price': r[5], 'order_time': r[6],
            'item_name': r[7], 'weapon_name': r[8], 'weapon_float': r[9],
        })
    return out


def _group_key(row: Dict[str, Any]) -> Tuple[str, str]:
    """以 (data_user, steam_hash_name) 作为配对作用域 — 跨平台,同账号内"""
    return (row.get('data_user') or '', row.get('steam_hash_name') or '')


def _insert_pairing(db: DatabaseManager, buy: Dict[str, Any], sell: Dict[str, Any],
                    quantity: int, pair_type: str = 'auto') -> Optional[int]:
    """插入一条配对记录,返回 pairing_id"""
    if quantity <= 0:
        return None
    buy_price = float(buy.get('price') or 0)
    sell_price = float(sell.get('price') or 0)
    profit = (sell_price - buy_price) * quantity
    now = _now_iso()

    sql = """
    INSERT INTO pnl_pairing (
        buy_id, buy_id_sub, buy_from,
        sell_id, sell_id_sub,
        data_user, steam_hash_name, quantity,
        buy_price, sell_price, profit,
        pair_type, is_excluded,
        sell_order_time, buy_order_time,
        created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    """
    params = (
        buy['ID'], buy.get('ID_sub'), buy['from'],
        sell['ID'], sell.get('ID_sub'),
        sell.get('data_user') or buy.get('data_user'),
        sell.get('steam_hash_name') or buy.get('steam_hash_name'),
        quantity,
        buy_price, sell_price, profit,
        pair_type,
        sell.get('order_time'), buy.get('order_time'),
        now, now,
    )
    return db.execute_insert(sql, params)


def run_auto_pairing(data_user: Optional[str] = None,
                     steam_hash_name: Optional[str] = None) -> Dict[str, Any]:
    """
    全量自动配对(增量执行 — 已配对的记录不会重复处理)

    Args:
        data_user: 限定账号
        steam_hash_name: 限定单一物品(调试用)

    Returns:
        { pairs_created, paired_quantity, buys_remaining, sells_remaining }
    """
    db = DatabaseManager()
    buys = _fetch_buys(db, data_user, steam_hash_name)
    sells = _fetch_sells(db, data_user, steam_hash_name)

    buys_by_group: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for b in buys:
        buys_by_group.setdefault(_group_key(b), []).append(b)

    sells_by_group: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for s in sells:
        sells_by_group.setdefault(_group_key(s), []).append(s)

    pairs_created = 0
    paired_quantity = 0

    for key, group_sells in sells_by_group.items():
        group_buys = buys_by_group.get(key, [])
        if not group_buys:
            continue

        bi = 0
        for sell in group_sells:
            sell_remaining = 1
            while sell_remaining > 0 and bi < len(group_buys):
                buy = group_buys[bi]
                take = min(sell_remaining, buy['remaining'])
                if take <= 0:
                    bi += 1
                    continue
                pairing_id = _insert_pairing(db, buy, sell, take, pair_type='auto')
                if pairing_id:
                    pairs_created += 1
                    paired_quantity += take
                buy['remaining'] -= take
                sell_remaining -= take
                if buy['remaining'] <= 0:
                    bi += 1

    buys_remaining = sum(max(b['remaining'], 0) for g in buys_by_group.values() for b in g)
    sells_remaining = sum(1 for g in sells_by_group.values() for _ in g) - paired_quantity

    return {
        'pairs_created': pairs_created,
        'paired_quantity': paired_quantity,
        'buys_remaining': buys_remaining,
        'sells_remaining': max(sells_remaining, 0),
    }


def manual_pair(buy_id: str, buy_from: str, sell_id: str,
                buy_id_sub: Optional[str] = None,
                sell_id_sub: Optional[str] = None,
                quantity: int = 1) -> Tuple[bool, str, Optional[int]]:
    """
    手动建立一对配对
    返回 (success, message, pairing_id)
    """
    db = DatabaseManager()
    if quantity <= 0:
        return False, 'quantity 必须大于 0', None

    buy_rows = db.execute_query(
        """
        SELECT ID, ID_sub, [from], steam_hash_name, data_user,
               price, order_time, COALESCE(buy_number, 1)
        FROM buy
        WHERE ID = ? AND [from] = ?
          AND (ID_sub IS ? OR (ID_sub IS NULL AND ? IS NULL))
        LIMIT 1
        """,
        (buy_id, buy_from, buy_id_sub, buy_id_sub)
    )
    if not buy_rows:
        return False, '未找到指定的买入记录', None
    br = buy_rows[0]
    buy = {
        'ID': br[0], 'ID_sub': br[1], 'from': br[2],
        'steam_hash_name': br[3], 'data_user': br[4],
        'price': br[5], 'order_time': br[6],
    }
    buy_qty = int(br[7] or 1)

    used_rows = db.execute_query(
        """
        SELECT COALESCE(SUM(quantity), 0) FROM pnl_pairing
        WHERE buy_id = ? AND buy_from = ?
          AND (buy_id_sub IS ? OR (buy_id_sub IS NULL AND ? IS NULL))
        """,
        (buy_id, buy_from, buy_id_sub, buy_id_sub)
    )
    buy_used = int(used_rows[0][0] or 0) if used_rows else 0
    if buy_qty - buy_used < quantity:
        return False, f'买入记录剩余数量不足(剩 {buy_qty - buy_used} 件)', None

    sell_rows = db.execute_query(
        """
        SELECT ID, ID_sub, [from], steam_hash_name, data_user, price, order_time
        FROM sell
        WHERE ID = ?
          AND (ID_sub IS ? OR (ID_sub IS NULL AND ? IS NULL))
        LIMIT 1
        """,
        (sell_id, sell_id_sub, sell_id_sub)
    )
    if not sell_rows:
        return False, '未找到指定的出售记录', None
    sr = sell_rows[0]
    sell = {
        'ID': sr[0], 'ID_sub': sr[1], 'from': sr[2],
        'steam_hash_name': sr[3], 'data_user': sr[4],
        'price': sr[5], 'order_time': sr[6],
    }

    sell_paired_rows = db.execute_query(
        """
        SELECT COUNT(*) FROM pnl_pairing
        WHERE sell_id = ?
          AND (sell_id_sub IS ? OR (sell_id_sub IS NULL AND ? IS NULL))
        """,
        (sell_id, sell_id_sub, sell_id_sub)
    )
    sell_paired = int(sell_paired_rows[0][0] or 0) if sell_paired_rows else 0
    if sell_paired > 0:
        return False, '该出售记录已被配对,请先解绑后再手动配对', None

    pairing_id = _insert_pairing(db, buy, sell, quantity, pair_type='manual')
    if pairing_id:
        return True, '配对成功', pairing_id
    return False, '配对写入失败', None


def manual_pair_price(sell_id: str, buy_price: Any,
                      sell_id_sub: Optional[str] = None,
                      quantity: int = 1) -> Tuple[bool, str, Optional[int]]:
    """
    手动配对(无买入记录):为某条出售记录直接录入购入价,生成一对配对
    买入侧字段留空(buy_id/buy_from/buy_order_time 为 NULL),buy_price 取手动输入值
    返回 (success, message, pairing_id)
    """
    db = DatabaseManager()
    if quantity <= 0:
        return False, 'quantity 必须大于 0', None
    try:
        bp = float(buy_price)
    except (TypeError, ValueError):
        return False, '购入价无效', None
    if bp < 0:
        return False, '购入价不能为负', None

    sell_rows = db.execute_query(
        """
        SELECT ID, ID_sub, [from], steam_hash_name, data_user, price, order_time
        FROM sell
        WHERE ID = ?
          AND (ID_sub IS ? OR (ID_sub IS NULL AND ? IS NULL))
        LIMIT 1
        """,
        (sell_id, sell_id_sub, sell_id_sub)
    )
    if not sell_rows:
        return False, '未找到指定的出售记录', None
    sr = sell_rows[0]
    sell = {
        'ID': sr[0], 'ID_sub': sr[1], 'from': sr[2],
        'steam_hash_name': sr[3], 'data_user': sr[4],
        'price': sr[5], 'order_time': sr[6],
    }

    sell_paired_rows = db.execute_query(
        """
        SELECT COUNT(*) FROM pnl_pairing
        WHERE sell_id = ?
          AND (sell_id_sub IS ? OR (sell_id_sub IS NULL AND ? IS NULL))
        """,
        (sell_id, sell_id_sub, sell_id_sub)
    )
    sell_paired = int(sell_paired_rows[0][0] or 0) if sell_paired_rows else 0
    if sell_paired > 0:
        return False, '该出售记录已被配对,请先解绑后再手动配对', None

    # buy_id / buy_from 为 NOT NULL,使用哨兵值(不会与真实数字 ID/平台名冲突),
    # 表示"无买入记录、仅手填购入价";明细 LEFT JOIN 不会命中任何 buy 行
    buy = {
        'ID': MANUAL_BUY_ID, 'ID_sub': None, 'from': MANUAL_BUY_FROM,
        'price': bp, 'order_time': None,
        'data_user': sell['data_user'], 'steam_hash_name': sell['steam_hash_name'],
    }
    pairing_id = _insert_pairing(db, buy, sell, quantity, pair_type='manual')
    if pairing_id:
        return True, '配对成功', pairing_id
    return False, '配对写入失败', None


def unpair(pairing_id: int) -> Tuple[bool, str]:
    """解绑一对配对(无论 auto 还是 manual)"""
    db = DatabaseManager()
    affected = db.execute_update("DELETE FROM pnl_pairing WHERE id = ?", (pairing_id,))
    if affected > 0:
        return True, '已解绑'
    return False, '未找到该配对记录'


def set_excluded(pairing_id: int, excluded: bool, reason: Optional[str] = None) -> Tuple[bool, str]:
    """剔除/恢复某对配对"""
    db = DatabaseManager()
    affected = db.execute_update(
        "UPDATE pnl_pairing SET is_excluded = ?, exclude_reason = ?, updated_at = ? WHERE id = ?",
        (1 if excluded else 0, reason if excluded else None, _now_iso(), pairing_id)
    )
    if affected > 0:
        return True, '已剔除' if excluded else '已恢复'
    return False, '未找到该配对记录'
