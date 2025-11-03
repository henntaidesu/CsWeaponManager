# -*- coding: utf-8 -*-
"""
Steam购买记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class SteamBuyModel(BaseModel):
    """Steam购买记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "steam_buy"
    
    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'ID': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True
            },
            'asset_id': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'price': {
                'type': 'REAL',
                'not_null': False,
                'default': None
            },
            'trade_date': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'listing_date': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'game_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'weapon_type': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
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
            'inspect_link': {
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
                'name': 'steam_buy_idx_weapon',
                'columns': ['weapon_name', 'item_name']
            },
            {
                'name': 'steam_buy_idx_date',
                'columns': ['trade_date']
            },
            {
                'name': 'steam_buy_idx_price',
                'columns': ['price']
            },
            {
                'name': 'steam_buy_idx_user',
                'columns': ['data_user']
            }
        ]
    
    @classmethod
    def find_by_user(cls, data_user: str, limit: int = None, offset: int = None):
        """根据用户查找购买记录"""
        return cls.find_all("data_user = ?", (data_user,), limit, offset)
    
    @classmethod
    def find_by_weapon(cls, weapon_name: str = None, item_name: str = None, limit: int = None, offset: int = None):
        """根据武器名称和皮肤名称查找购买记录"""
        where_conditions = []
        params = []
        
        if weapon_name:
            where_conditions.append("weapon_name LIKE ?")
            params.append(f"%{weapon_name}%")
        
        if item_name:
            where_conditions.append("item_name LIKE ?")
            params.append(f"%{item_name}%")
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        return cls.find_all(where_clause, tuple(params), limit, offset)
    
    @classmethod
    def get_recent_purchases(cls, data_user: str = None, limit: int = 20, offset: int = 0):
        """获取最近的购买记录"""
        where_clause = "1=1"
        params = []
        
        if data_user:
            where_clause = "data_user = ?"
            params.append(data_user)
        
        where_clause += " ORDER BY created_at DESC"
        return cls.find_all(where_clause, tuple(params), limit, offset)
    
    @classmethod
    def get_purchase_statistics(cls, data_user: str = None) -> Dict[str, Any]:
        """获取购买统计信息"""
        db = cls().db
        where_clause = ""
        params = []
        
        if data_user:
            where_clause = "WHERE data_user = ?"
            params.append(data_user)
        
        sql = f"""
        SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(price), 0) as total_spent,
            COALESCE(AVG(price), 0) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price
        FROM steam_buy 
        {where_clause}
        """
        
        try:
            result = db.execute_query(sql, tuple(params))
            if result:
                return {
                    'total_count': result[0][0],
                    'total_spent': result[0][1],
                    'avg_price': result[0][2],
                    'min_price': result[0][3],
                    'max_price': result[0][4]
                }
            return {'total_count': 0, 'total_spent': 0, 'avg_price': 0, 'min_price': 0, 'max_price': 0}
        except Exception as e:
            print(f"获取购买统计信息失败: {e}")
            return {'total_count': 0, 'total_spent': 0, 'avg_price': 0, 'min_price': 0, 'max_price': 0}
