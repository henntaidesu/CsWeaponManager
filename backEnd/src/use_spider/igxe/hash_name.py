"""
IGXE steam_hash_name 解析

IGXE 的订单/租赁接口经常不返回 market_hash_name（租赁详情的 assets 实测为空），
此前回退成图片 URL 写进 steam_hash_name，前端按 hash name 拼本地图片路径必然失败。
这里改为查 weapon_classID 映射表反查真实 hash name；查不到就留空，绝不写 URL。
"""

from src.db_manager.index.model.weapon_classID import WeaponClassIDModel

# CS2 磨损区间 -> steam market hash name 中的英文外观
# 区间为左闭右开，与 Valve 的划分一致
_EXTERIOR_BY_FLOAT = (
    (0.07, 'Factory New'),
    (0.15, 'Minimal Wear'),
    (0.38, 'Field-Tested'),
    (0.45, 'Well-Worn'),
)
_EXTERIOR_WORST = 'Battle-Scarred'


def exterior_from_float(weapon_float):
    """按磨损值推断英文外观；值无效时返回 None"""
    if weapon_float is None or weapon_float == '':
        return None
    try:
        value = float(weapon_float)
    except (TypeError, ValueError):
        return None
    if value < 0 or value > 1:
        return None
    for upper, name in _EXTERIOR_BY_FLOAT:
        if value < upper:
            return name
    return _EXTERIOR_WORST


def pick_by_exterior(hash_names, exterior):
    """
    从候选 hash name 中挑出外观匹配的那个。

    - 只有一个候选：直接用（无外观概念的饰品，如探员、印花、勋章）
    - 多个候选且能推出外观：取后缀为 (外观) 的那个
    - 多个候选但推不出外观：无法判定，返回 None，宁可留空也不写错
    """
    candidates = [h for h in hash_names if h]
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]
    if not exterior:
        return None
    suffix = f"({exterior})"
    for name in candidates:
        if name.endswith(suffix):
            return name
    return None


def resolve_steam_hash_name(market_hash_name, weapon_name, item_name, weapon_float=None):
    """
    解析出可用于本地图片查找的 steam_hash_name。

    优先用接口直接给的 market_hash_name；没有就按中文名查映射表，
    多个磨损档候选时用 weapon_float 推断外观定位。
    始终不会返回图片 URL —— 解析不出来时返回 None。
    """
    if market_hash_name and not str(market_hash_name).startswith(('http://', 'https://')):
        return market_hash_name

    if not weapon_name and not item_name:
        return None

    try:
        records = WeaponClassIDModel.find_by_weapon_info(
            weapon_name=weapon_name, item_name=item_name)
    except Exception as e:
        print(f"查询 weapon_classID 失败: {e}")
        return None

    return pick_by_exterior(
        [getattr(r, 'steam_hash_name', None) for r in (records or [])],
        exterior_from_float(weapon_float),
    )
