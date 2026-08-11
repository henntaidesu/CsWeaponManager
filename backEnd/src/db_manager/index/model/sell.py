# -*- coding: utf-8 -*-
"""
销售记录表模型
"""

from typing import Dict, Any, List
from ...base_model import BaseModel


class SellModel(BaseModel):
    """销售记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "sell"
    
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
            'steam_hash_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'Steam 市场 hash name'
            },
            'sticker': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '饰品印花信息(JSON)'
            },
            'pendant': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '挂件信息(JSON)'
            },
            'rename': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '改名信息'
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
            'st': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'sou': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            # 'sell_number': {
            #     'type': 'INTEGER',
            #     'not_null': False,
            #     'default': None
            # },
            # 'err_number': {
            #     'type': 'INTEGER',
            #     'not_null': False,
            #     'default': None
            # },
            # 'price_all': {
            #     'type': 'REAL',
            #     'not_null': False,
            #     'default': None
            # },
            'data_user': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            }
            ,
            'ID_sub': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': False,
            },
            'assetid': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'Steam 资产号'
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'sell_idx',
                'columns': ['weapon_name', 'item_name', 'weapon_float', 'float_range', 'price', 'buyer_name', 'order_time', 'status', 'from']
            }
        ]
