# -*- coding: utf-8 -*-
"""
Steam库存历史记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class SteamInventoryHistoryModel(BaseModel):
    """Steam库存历史记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "steam_inventoryhistory"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'ID': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': None,
                'comment': '记录唯一ID'
            },
            'instanceid': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': None,
                'comment': '饰品ID'
            },
            'classid': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': None,
                'comment': '饰品ID'
            },
            'order_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None,
                'comment': '订单时间'
            },
            'trade_title': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '交易标题'
            },
            'appid': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '应用ID'
            },
            'item_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '物品名称'
            },
            'weapon_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '武器名称'
            },
            'weapon_type': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '武器类型'
            },
            'float_range': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '磨损值范围'
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
                'comment': 'Steam用户ID'
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'steam_inventoryhistory_idx_order_time',
                'columns': ['order_time']
            },
            {
                'name': 'steam_inventoryhistory_idx_trade_type',
                'columns': ['trade_type']
            },
            {
                'name': 'steam_inventoryhistory_idx_appid',
                'columns': ['appid']
            },
            {
                'name': 'steam_inventoryhistory_idx_weapon_type',
                'columns': ['weapon_type']
            },
            {
                'name': 'steam_inventoryhistory_idx_data_user',
                'columns': ['data_user']
            }
        ]

    @classmethod
    def find_by_time_range(cls, start_time: str, end_time: str, limit: int = None, offset: int = None):
        """根据时间范围查找历史记录"""
        return cls.find_all(
            "DATE(order_time) BETWEEN ? AND ? ORDER BY order_time DESC",
            (start_time, end_time),
            limit,
            offset
        )

    @classmethod
    def find_by_trade_type(cls, trade_type: str, limit: int = None, offset: int = None):
        """根据交易类型查找历史记录"""
        return cls.find_all(
            "trade_type = ? ORDER BY order_time DESC",
            (trade_type,),
            limit,
            offset
        )

    @classmethod
    def find_by_weapon_type(cls, weapon_type: str, limit: int = None, offset: int = None):
        """根据武器类型查找历史记录"""
        return cls.find_all(
            "weapon_type = ? ORDER BY order_time DESC",
            (weapon_type,),
            limit,
            offset
        )

    @classmethod
    def find_by_appid(cls, appid: str, limit: int = None, offset: int = None):
        """根据appid查找历史记录"""
        return cls.find_all(
            "appid = ? ORDER BY order_time DESC",
            (appid,),
            limit,
            offset
        )

    @classmethod
    def get_latest_records(cls, limit: int = 10):
        """获取最新的记录"""
        return cls.find_all(
            "1=1 ORDER BY order_time DESC",
            (),
            limit=limit
        )


