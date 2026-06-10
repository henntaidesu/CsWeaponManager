# -*- coding: utf-8 -*-
"""
CSQAQ 饰品价格历史分表模型
存储 CSQAQ 单件饰品走势图（/info/chart）的日级历史数据。
一行 = 一件饰品（good_id） × 一个平台 × 一天。

按 csqaq_id(good_id) 区间分表，每 2000 个 ID 一张表，首次写入时自动建表：
- good_id 1~2000    -> csqaq_price_history_1_2000
- good_id 2001~4000 -> csqaq_price_history_2001_4000
- good_id 4001~6000 -> csqaq_price_history_4001_6000
请通过 get_shard_model(good_id) 获取对应分表的模型类，不要直接使用基类。
"""

from typing import Dict, Any, List
from datetime import datetime
from ...base_model import BaseModel

# 每张分表存储的 csqaq_id 数量
SHARD_SIZE = 2000

# 走势图指标列（与 CSQAQ /info/chart 的 key 同名）
METRIC_COLUMNS = (
    'sell_price', 'buy_price', 'sell_num', 'buy_num',
    'short_lease_price', 'long_lease_price', 'lease_num',
    'turnover_number', 'transfer_price',
)

# 已创建的分表模型缓存 {shard_start: 模型类}
_shard_model_cache: Dict[int, type] = {}


class CsqaqPriceHistoryModel(BaseModel):
    """CSQAQ 价格历史基础模型（按 good_id 区间分表）"""

    _shard_start = 1  # 分表起始 good_id，由 get_shard_model 创建的动态子类覆盖

    @classmethod
    def get_table_name(cls) -> str:
        return f"csqaq_price_history_{cls._shard_start}_{cls._shard_start + SHARD_SIZE - 1}"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        """
        字段说明：
        - good_id: CSQAQ商品ID（即weapon_classID.csqaq_id）
        - platform: 平台（1-BUFF 2-悠悠有品 3-Steam）
        - price_date: 日期（YYYY-MM-DD）
        - 其余指标列与走势图接口的 key 同名，按需填充
        """
        return {
            'good_id': {
                'type': 'INTEGER',
                'primary_key': True,
                'not_null': True,
                'default': None
            },
            'platform': {
                'type': 'INTEGER',
                'primary_key': True,
                'not_null': True,
                'default': None
            },
            'price_date': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True,
                'default': None
            },
            'sell_price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'buy_price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'sell_num': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'buy_num': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'short_lease_price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'long_lease_price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'lease_num': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'turnover_number': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'transfer_price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'update_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            }
        }

    @classmethod
    def has_data(cls, good_id: int, platform: int = None) -> bool:
        """检查某件饰品是否已有历史数据（用于断点续传跳过）"""
        where = "[good_id] = ?"
        params: List[Any] = [int(good_id)]
        if platform is not None:
            where += " AND [platform] = ?"
            params.append(int(platform))
        sql = f"SELECT 1 FROM {cls.get_table_name()} WHERE {where} LIMIT 1"
        try:
            return len(cls().db.execute_query(sql, tuple(params))) > 0
        except Exception:
            return False

    @classmethod
    def upsert_chart_rows(cls, good_id: int, platform: int, rows: Dict[str, Dict[str, Any]]) -> int:
        """
        批量写入某件饰品某平台的走势图数据（单事务）。

        :param rows: {price_date: {指标列名: 值}}，已存在的日期只更新本次提供的列
        :return: 写入/更新的行数
        """
        if not rows:
            return 0
        good_id = int(good_id)
        platform = int(platform)
        db = cls().db
        table = cls.get_table_name()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 本批数据涉及的指标列（保持稳定顺序）
        columns = [c for c in METRIC_COLUMNS if any(c in vals for vals in rows.values())]
        if not columns:
            return 0

        existing = {
            row[0] for row in db.execute_query(
                f"SELECT [price_date] FROM {table} WHERE [good_id] = ? AND [platform] = ?",
                (good_id, platform))
        }

        insert_params = []
        update_params = []
        for price_date, vals in rows.items():
            values = [vals.get(c) for c in columns]
            if price_date in existing:
                update_params.append(tuple(values + [now, good_id, platform, price_date]))
            else:
                insert_params.append(tuple([good_id, platform, price_date] + values + [now]))

        written = 0
        try:
            if insert_params:
                cols_sql = ', '.join(f'[{c}]' for c in ['good_id', 'platform', 'price_date'] + columns + ['update_time'])
                placeholders = ', '.join(['?'] * (len(columns) + 4))
                written += db.execute_many(
                    f"INSERT INTO {table} ({cols_sql}) VALUES ({placeholders})", insert_params)
            if update_params:
                set_sql = ', '.join([f'[{c}] = ?' for c in columns] + ['[update_time] = ?'])
                written += db.execute_many(
                    f"UPDATE {table} SET {set_sql} WHERE [good_id] = ? AND [platform] = ? AND [price_date] = ?",
                    update_params)
        except Exception as e:
            print(f"[错误] 写入CSQAQ价格历史失败 - 表: {table}, good_id: {good_id}, 错误: {e}")
            raise
        return written

    @classmethod
    def find_by_good_id(cls, good_id: int, platform: int = None, start_date: str = None, end_date: str = None):
        """查询某件饰品的价格历史（按日期升序）"""
        where = "[good_id] = ?"
        params: List[Any] = [int(good_id)]
        if platform is not None:
            where += " AND [platform] = ?"
            params.append(int(platform))
        if start_date:
            where += " AND [price_date] >= ?"
            params.append(start_date)
        if end_date:
            where += " AND [price_date] <= ?"
            params.append(end_date)
        return cls.find_all(where=where, params=tuple(params), order_by="[price_date] ASC")


def get_shard_model(good_id) -> type:
    """
    根据 good_id 获取对应分表的模型类（缓存），并确保表已创建。
    例如 good_id=4001 -> csqaq_price_history_4001_6000
    """
    good_id = int(good_id)
    if good_id <= 0:
        raise ValueError(f"无效的 good_id: {good_id}")
    shard_start = ((good_id - 1) // SHARD_SIZE) * SHARD_SIZE + 1
    model = _shard_model_cache.get(shard_start)
    if model is None:
        model = type(
            f"CsqaqPriceHistoryModel_{shard_start}",
            (CsqaqPriceHistoryModel,),
            {'_shard_start': shard_start},
        )
        model.ensure_table_exists()
        _shard_model_cache[shard_start] = model
    return model
