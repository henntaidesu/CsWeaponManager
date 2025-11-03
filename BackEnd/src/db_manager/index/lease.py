# -*- coding: utf-8 -*-
"""
租赁记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class LeaseModel(BaseModel):
    """租赁记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "lease"
    
    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'ID': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True
            },
            'lease_day': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'status': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'unit_price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'deposit': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'create_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            },
            'item_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
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
            'float_range': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'weapon_float': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'leaser_id': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'leaser_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'buy_of': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'lease_from': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'lease_idx',
                'columns': ['ID', 'lease_day', 'status', 'unit_price', 'deposit', 'create_time', 'item_name', 'weapon_name', 'weapon_type', 'float_range', 'weapon_float', 'leaser_id', 'leaser_name', 'buy_of', 'lease_from']
            }
        ]
