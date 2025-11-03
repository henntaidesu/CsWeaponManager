# -*- coding: utf-8 -*-
"""
购买记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class BuyModel(BaseModel):
    """购买记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "buy"
    
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
            'steam_id': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'buy_number': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            # 'err_number': {
            #     'type': 'INTEGER',
            #     'not_null': False,
            #     'default': None
            # },
            'sell_of': {
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
            # 原有的综合索引
            {
                'name': 'buy_idx',
                'columns': ['weapon_name', 'item_name', 'weapon_float', 'float_range', 'price', 'seller_name', 'status', 'from']
            },
            # 针对库存查询优化的索引：精确匹配 item_name + weapon_float
            {
                'name': 'buy_idx_item_float',
                'columns': ['item_name', 'weapon_float']
            },
            # 针对库存查询优化的索引：只匹配 item_name（用于平均价格计算）
            {
                'name': 'buy_idx_item_name',
                'columns': ['item_name']
            },
            # 针对价格查询优化的索引
            {
                'name': 'buy_idx_item_price',
                'columns': ['item_name', 'price']
            }
        ]
    
    @classmethod
    def find_by_status(cls, status: str, limit: int = None, offset: int = None):
        """根据状态查找购买记录"""
        return cls.find_all("status = ?", (status,), limit, offset)
    
    @classmethod
    def find_by_user(cls, data_user: str, limit: int = None, offset: int = None):
        """根据用户查找购买记录"""
        return cls.find_all("data_user = ?", (data_user,), limit, offset)
    
    @classmethod
    def find_by_weapon_name(cls, weapon_name: str, limit: int = None, offset: int = None):
        """根据武器名称查找购买记录"""
        return cls.find_all("weapon_name LIKE ?", (f"%{weapon_name}%",), limit, offset)
    
    @classmethod
    def get_recent_orders(cls, limit: int = 20, offset: int = 0):
        """获取最近的订单"""
        return cls.find_all("1=1 ORDER BY order_time DESC", (), limit, offset)
    
    @classmethod
    def get_statistics_by_status(cls) -> Dict[str, int]:
        """按状态统计购买记录"""
        db = cls().db
        sql = """
        SELECT status, COUNT(*) as count 
        FROM buy 
        WHERE status IS NOT NULL 
        GROUP BY status
        """
        
        try:
            result = db.execute_query(sql)
            stats = {}
            for row in result:
                stats[row[0]] = row[1]
            return stats
        except Exception as e:
            print(f"获取统计信息失败: {e}")
            return {}
    
    @classmethod
    def get_total_amount(cls, where: str = "", params: tuple = ()) -> float:
        """获取总金额"""
        db = cls().db
        sql = "SELECT COALESCE(SUM(price), 0) FROM buy"
        
        if where:
            sql += f" WHERE {where}"
        
        try:
            result = db.execute_query(sql, params)
            return float(result[0][0]) if result else 0.0
        except Exception as e:
            print(f"获取总金额失败: {e}")
            return 0.0
