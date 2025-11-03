# -*- coding: utf-8 -*-
"""
Steam库存表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class SteamInventoryModel(BaseModel):
    """Steam库存表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "steam_inventory"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'assetid': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True,
                'comment': '资产ID（主键）'
            },
            'instanceid': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': None,
                'comment': '实例ID'
            },
            'classid': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': None,
                'comment': '类ID'
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
            'float_range': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '磨损值范围'
            },
            'weapon_type': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '武器类型'
            },
            'weapon_float': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '武器磨损值'
            },
            'remark': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '备注信息（交易保护等）'
            },
            'data_user': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '用户Steam ID'
            },
            'buy_price': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '购入价格'
            },
            'yyyp_price': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '悠悠价格'
            },
            'buff_price': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'BUFF价格'
            },
            'steam_price': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'Steam价格'
            },
            'order_time': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '入库时间'
            },
            'if_inventory': {
                'type': 'TEXT',
                'not_null': False,
                'default': '1',
                'comment': '是否在库存中：1=存在，0=不存在'
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'steam_inventory_idx_remark',
                'columns': ['remark']
            },
            {
                'name': 'steam_inventory_idx_weapon_type',
                'columns': ['weapon_type']
            },
            {
                'name': 'steam_inventory_idx_data_user',
                'columns': ['data_user']
            }
        ]

    @classmethod
    def find_by_user(cls, data_user: str, limit: int = None, offset: int = None):
        """根据用户Steam ID查找库存记录"""
        return cls.find_all("data_user = ?", (data_user,), limit, offset)

    @classmethod
    def find_by_assetid(cls, assetid: str):
        """根据assetid查找库存记录"""
        records = cls.find_all("assetid = ?", (assetid,))
        return records[0] if records else None

    @classmethod
    def find_by_weapon_type(cls, weapon_type: str, data_user: str = None, limit: int = None, offset: int = None):
        """根据武器类型查找库存记录"""
        if data_user:
            return cls.find_all(
                "weapon_type = ? AND data_user = ? ORDER BY order_time DESC",
                (weapon_type, data_user),
                limit,
                offset
            )
        return cls.find_all(
            "weapon_type = ? ORDER BY order_time DESC",
            (weapon_type,),
            limit,
            offset
        )

    @classmethod
    def get_latest_records(cls, data_user: str = None, limit: int = 10):
        """获取最新的库存记录"""
        if data_user:
            return cls.find_all(
                "data_user = ? ORDER BY order_time DESC",
                (data_user,),
                limit=limit
            )
        return cls.find_all(
            "1=1 ORDER BY order_time DESC",
            (),
            limit=limit
        )

