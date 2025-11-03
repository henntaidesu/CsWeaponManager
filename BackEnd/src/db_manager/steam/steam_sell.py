# -*- coding: utf-8 -*-
"""
Steam销售记录表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class SteamSellModel(BaseModel):
    """Steam销售记录表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "steam_sell"
    
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
            'price_original': {
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
                'name': 'steam_sell_idx_weapon',
                'columns': ['weapon_name', 'item_name']
            },
            {
                'name': 'steam_sell_idx_date',
                'columns': ['trade_date']
            },
            {
                'name': 'steam_sell_idx_price',
                'columns': ['price', 'price_original']
            },
            {
                'name': 'steam_sell_idx_user',
                'columns': ['data_user']
            }
        ]
    
    @classmethod
    def find_by_user(cls, data_user: str, limit: int = None, offset: int = None):
        """根据用户查找销售记录"""
        return cls.find_all("data_user = ?", (data_user,), limit, offset)
    
    @classmethod
    def find_by_weapon(cls, weapon_name: str = None, item_name: str = None, limit: int = None, offset: int = None):
        """根据武器名称和皮肤名称查找销售记录"""
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
    def get_recent_sales(cls, data_user: str = None, limit: int = 20, offset: int = 0):
        """获取最近的销售记录"""
        where_clause = "1=1"
        params = []
        
        if data_user:
            where_clause = "data_user = ?"
            params.append(data_user)
        
        where_clause += " ORDER BY created_at DESC"
        return cls.find_all(where_clause, tuple(params), limit, offset)
    
    @classmethod
    def get_sales_statistics(cls, data_user: str = None) -> Dict[str, Any]:
        """获取销售统计信息"""
        db = cls().db
        where_clause = ""
        params = []
        
        if data_user:
            where_clause = "WHERE data_user = ?"
            params.append(data_user)
        
        sql = f"""
        SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(price), 0) as total_income,
            COALESCE(SUM(price_original), 0) as total_original,
            COALESCE(AVG(price), 0) as avg_price,
            COALESCE(AVG(price_original), 0) as avg_original_price,
            MIN(price) as min_price,
            MAX(price) as max_price
        FROM steam_sell 
        {where_clause}
        """
        
        try:
            result = db.execute_query(sql, tuple(params))
            if result:
                total_income = result[0][1]
                total_original = result[0][2]
                commission = total_original - total_income  # Steam手续费
                
                return {
                    'total_count': result[0][0],
                    'total_income': total_income,
                    'total_original': total_original,
                    'commission': commission,
                    'avg_price': result[0][3],
                    'avg_original_price': result[0][4],
                    'min_price': result[0][5],
                    'max_price': result[0][6]
                }
            return {
                'total_count': 0, 'total_income': 0, 'total_original': 0, 
                'commission': 0, 'avg_price': 0, 'avg_original_price': 0, 
                'min_price': 0, 'max_price': 0
            }
        except Exception as e:
            print(f"获取销售统计信息失败: {e}")
            return {
                'total_count': 0, 'total_income': 0, 'total_original': 0, 
                'commission': 0, 'avg_price': 0, 'avg_original_price': 0, 
                'min_price': 0, 'max_price': 0
            }
