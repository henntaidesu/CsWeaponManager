# -*- coding: utf-8 -*-
"""
盈亏配对表模型
存放购入订单与出售订单之间的 N:M 配对关系
- 一条配对记录代表「某次买入的 N 件被某次卖出消化」
- profit = (sell.price - buy.price) * quantity（实收口径）
- 跨平台允许（同 data_user 内）
- is_excluded=1 用于剔除（如导Steam余额的低价卖单）
"""

from typing import Dict, Any, List
from ...base_model import BaseModel


class PnlPairingModel(BaseModel):
    """盈亏配对记录"""

    @classmethod
    def get_table_name(cls) -> str:
        return "pnl_pairing"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'id': {
                'type': 'INTEGER',
                'primary_key': True,
                'not_null': True,
            },
            'buy_id': {
                'type': 'TEXT',
                'not_null': True,
                'comment': '关联 buy 表 ID'
            },
            'buy_id_sub': {
                'type': 'TEXT',
                'not_null': False,
                'comment': '关联 buy 表 ID_sub'
            },
            'buy_from': {
                'type': 'TEXT',
                'not_null': True,
                'comment': '关联 buy 表 from（buy 复合主键的一部分）'
            },
            'sell_id': {
                'type': 'TEXT',
                'not_null': True,
                'comment': '关联 sell 表 ID'
            },
            'sell_id_sub': {
                'type': 'TEXT',
                'not_null': False,
                'comment': '关联 sell 表 ID_sub（复合主键）'
            },
            'data_user': {
                'type': 'TEXT',
                'not_null': False,
                'comment': '账号（配对作用域）'
            },
            'steam_hash_name': {
                'type': 'TEXT',
                'not_null': False,
                'comment': '配对物品 hash name 快照'
            },
            'quantity': {
                'type': 'INTEGER',
                'not_null': True,
                'default': 1,
                'comment': '本次配对的件数'
            },
            'buy_price': {
                'type': 'REAL',
                'not_null': False,
                'comment': '买入单价快照'
            },
            'sell_price': {
                'type': 'REAL',
                'not_null': False,
                'comment': '出售实收单价快照'
            },
            'profit': {
                'type': 'REAL',
                'not_null': False,
                'comment': '本次配对盈亏 = (sell_price - buy_price) * quantity'
            },
            'pair_type': {
                'type': 'TEXT',
                'not_null': False,
                'default': "'auto'",
                'comment': 'auto / manual'
            },
            'is_excluded': {
                'type': 'INTEGER',
                'not_null': False,
                'default': 0,
                'comment': '是否从统计中剔除（0/1）'
            },
            'exclude_reason': {
                'type': 'TEXT',
                'not_null': False,
                'comment': '剔除原因'
            },
            'sell_order_time': {
                'type': 'DATETIME',
                'not_null': False,
                'comment': '出售时间快照（用于日历归集）'
            },
            'buy_order_time': {
                'type': 'DATETIME',
                'not_null': False,
                'comment': '买入时间快照'
            },
            'created_at': {
                'type': 'DATETIME',
                'not_null': False,
                'default': 'CURRENT_TIMESTAMP'
            },
            'updated_at': {
                'type': 'DATETIME',
                'not_null': False,
                'default': 'CURRENT_TIMESTAMP'
            },
        }

    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'pnl_pairing_idx_sell',
                'columns': ['sell_id', 'sell_id_sub']
            },
            {
                'name': 'pnl_pairing_idx_buy',
                'columns': ['buy_id', 'buy_from']
            },
            {
                'name': 'pnl_pairing_idx_sell_time',
                'columns': ['sell_order_time']
            },
            {
                'name': 'pnl_pairing_idx_user_item',
                'columns': ['data_user', 'steam_hash_name']
            },
            {
                'name': 'pnl_pairing_idx_excluded',
                'columns': ['is_excluded']
            },
        ]
