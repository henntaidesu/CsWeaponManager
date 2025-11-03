# -*- coding: utf-8 -*-
"""
资金记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class FundsModel(BaseModel):
    """资金记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "funds"
    
    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'sources_of_funds': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'aliplay or wechatplay or steamplay'
            },
            'type': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'amount': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'date': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'funds_idx',
                'columns': ['sources_of_funds', 'type', 'amount', 'date']
            }
        ]
