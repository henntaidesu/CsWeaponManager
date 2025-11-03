# -*- coding: utf-8 -*-
"""
Steam库存历史记录索引表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class SteamInventoryHistoryIndexModel(BaseModel):
    """Steam库存历史记录索引表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "steam_inventoryhistory_index"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'ID': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True,
                'comment': '记录唯一ID'
            },
            'order_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None,
                'comment': '订单时间'
            },
            'trade_type': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '交易类型：+ 或 -'
            },
            'data_user': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '用户标识'
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'steam_inventoryhistory_index_idx_order_time',
                'columns': ['order_time']
            },
            {
                'name': 'steam_inventoryhistory_index_idx_trade_type',
                'columns': ['trade_type']
            },
            {
                'name': 'steam_inventoryhistory_index_idx_user',
                'columns': ['data_user']
            }
        ]

    @classmethod
    def find_by_user(cls, data_user: str, limit: int = None, offset: int = None):
        """根据用户查找历史记录索引"""
        return cls.find_all(
            "data_user = ? ORDER BY order_time DESC",
            (data_user,),
            limit,
            offset
        )

    @classmethod
    def find_by_time_range(cls, start_time: str, end_time: str, limit: int = None, offset: int = None):
        """根据时间范围查找历史记录索引"""
        return cls.find_all(
            "DATE(order_time) BETWEEN ? AND ? ORDER BY order_time DESC",
            (start_time, end_time),
            limit,
            offset
        )

    @classmethod
    def find_by_trade_type(cls, trade_type: str, limit: int = None, offset: int = None):
        """根据交易类型查找历史记录索引"""
        return cls.find_all(
            "trade_type = ? ORDER BY order_time DESC",
            (trade_type,),
            limit,
            offset
        )

    @classmethod
    def get_latest_records(cls, limit: int = 10):
        """获取最新的记录索引"""
        return cls.find_all(
            "1=1 ORDER BY order_time DESC",
            (),
            limit=limit
        )

    @classmethod
    def find_by_user_and_type(cls, data_user: str, trade_type: str = None, limit: int = None, offset: int = None):
        """根据用户和交易类型查找历史记录索引"""
        where_conditions = ["data_user = ?"]
        params = [data_user]
        
        if trade_type:
            where_conditions.append("trade_type = ?")
            params.append(trade_type)
        
        where_clause = " AND ".join(where_conditions) + " ORDER BY order_time DESC"
        return cls.find_all(where_clause, tuple(params), limit, offset)

