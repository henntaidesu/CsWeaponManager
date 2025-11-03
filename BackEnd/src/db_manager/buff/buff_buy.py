# -*- coding: utf-8 -*-
"""
Buff购买记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class BuffBuyModel(BaseModel):
    """Buff购买记录表模型"""

    @classmethod
    def get_table_name(cls) -> str:
        return "buff_buy"

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
            'seller_name': {
                'type': 'TEXT',
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
                'primary_key': True,
                'not_null': True
            },
            'order_time': {
                'type': 'DATETIME',
                'not_null': False,
                'default': None
            },
            'sell_of': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'payment': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'trade_type': {
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
                'name': 'buff_buy_idx',
                'columns': ['weapon_name', 'item_name', 'weapon_float', 'float_range', 'price', 'seller_name', 'status', 'from']
            }
        ]

    @classmethod
    def find_not_end_status(cls, data_user: str):
        """查找未结束状态的订单"""
        return cls.find_all("status NOT IN ('已完成', '已取消') AND data_user = ?", (data_user,))

    @classmethod
    def get_latest_order_time(cls, data_user: str):
        """获取最新订单时间"""
        db = cls().db
        sql = "SELECT order_time FROM buff_buy WHERE data_user = ? ORDER BY order_time DESC LIMIT 1"

        try:
            result = db.execute_query(sql, (data_user,))
            return result[0][0] if result else None
        except Exception as e:
            print(f"获取最新订单时间失败: {e}")
            return None