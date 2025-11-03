# -*- coding: utf-8 -*-
"""
Buff销售记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class BuffSellModel(BaseModel):
    """Buff销售记录表模型"""

    @classmethod
    def get_table_name(cls) -> str:
        return "buff_sell"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'ID': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True
            },
            'weapon_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'weapon_type': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'item_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'weapon_float': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'float_range': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'price_original': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'buyer_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'order_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            },
            'status': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'status_sub': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'from': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'steam_id': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'data_user': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            }
        }

    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'buff_sell_idx',
                'columns': ['weapon_name', 'item_name', 'weapon_float', 'float_range', 'price', 'buyer_name', 'order_time', 'status', 'from']
            }
        ]