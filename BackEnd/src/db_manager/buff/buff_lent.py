# -*- coding: utf-8 -*-
"""
Buff租借记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class BuffLentModel(BaseModel):
    """Buff租借记录表模型"""

    @classmethod
    def get_table_name(cls) -> str:
        return "buff_lent"

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
            'lenter_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'status': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'last_status': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'from': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'lean_start_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            },
            'lean_end_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            },
            'total_Lease_Days': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'max_Lease_Days': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            }
        }

    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'buff_lent_idx',
                'columns': ['weapon_name', 'weapon_float', 'float_range', 'price', 'lenter_name', 'lean_start_time', 'status', 'from']
            }
        ]