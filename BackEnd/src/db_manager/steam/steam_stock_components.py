# -*- coding: utf-8 -*-
"""
Steam库存配件表模型
"""

from typing import Dict, Any, List
from ..base_model import BaseModel


class SteamStockComponentsModel(BaseModel):
    """Steam库存配件表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "steam_stockComponents"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'instanceid': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True,
                'default': None,
                'comment': '实例ID'
            },
            'assetid': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': False,
                'comment': '资产ID（主键）'
            },
            'classid': {
                'type': 'TEXT',
                'primary_key': False,
                'not_null': False,
                'default': None,
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
            'weapon_level': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '武器等级'
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
            'order_time': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '入库时间'
            },
            'steam_price': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'Steam价格'
            }
        }
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'steam_stockComponents_idx_data_user',
                'columns': ['data_user']
            },
            {
                'name': 'steam_stockComponents_idx_weapon_type',
                'columns': ['weapon_type']
            },
            {
                'name': 'steam_stockComponents_idx_order_time',
                'columns': ['order_time']
            }
        ]

    @classmethod
    def find_by_assetid(cls, assetid: str):
        """根据assetid查找配件记录"""
        return cls.find_by_id(assetid=assetid)

    @classmethod
    def find_by_user(cls, data_user: str, limit: int = None, offset: int = None):
        """根据用户Steam ID查找配件记录"""
        return cls.find_all(
            "[data_user] = ? ORDER BY [order_time] DESC",
            (data_user,),
            limit,
            offset
        )

    @classmethod
    def find_by_weapon_type(cls, weapon_type: str, data_user: str = None, limit: int = None, offset: int = None):
        """根据武器类型查找配件记录"""
        if data_user:
            return cls.find_all(
                "[weapon_type] = ? AND [data_user] = ? ORDER BY [order_time] DESC",
                (weapon_type, data_user),
                limit,
                offset
            )
        return cls.find_all(
            "[weapon_type] = ? ORDER BY [order_time] DESC",
            (weapon_type,),
            limit,
            offset
        )

    @classmethod
    def find_by_weapon_name(cls, weapon_name: str, data_user: str = None, limit: int = None, offset: int = None):
        """根据武器名称查找配件记录"""
        if data_user:
            return cls.find_all(
                "[weapon_name] = ? AND [data_user] = ? ORDER BY [order_time] DESC",
                (weapon_name, data_user),
                limit,
                offset
            )
        return cls.find_all(
            "[weapon_name] = ? ORDER BY [order_time] DESC",
            (weapon_name,),
            limit,
            offset
        )

    @classmethod
    def get_latest_records(cls, data_user: str = None, limit: int = 10):
        """获取最新的配件记录"""
        if data_user:
            return cls.find_all(
                "[data_user] = ? ORDER BY [order_time] DESC",
                (data_user,),
                limit=limit
            )
        return cls.find_all(
            "1=1 ORDER BY [order_time] DESC",
            (),
            limit=limit
        )

    @classmethod
    def count_by_user(cls, data_user: str) -> int:
        """统计用户的配件总数"""
        return cls.count("[data_user] = ?", (data_user,))

    @classmethod
    def find_by_time_range(cls, start_date: str, end_date: str, data_user: str = None, limit: int = None, offset: int = None):
        """根据时间范围查找配件记录"""
        if data_user:
            return cls.find_all(
                "[order_time] >= ? AND [order_time] <= ? AND [data_user] = ? ORDER BY [order_time] DESC",
                (start_date, end_date, data_user),
                limit,
                offset
            )
        return cls.find_all(
            "[order_time] >= ? AND [order_time] <= ? ORDER BY [order_time] DESC",
            (start_date, end_date),
            limit,
            offset
        )

    @classmethod
    def get_statistics_by_user(cls, data_user: str) -> Dict[str, Any]:
        """获取用户的配件统计信息"""
        db = cls().db
        
        # 总数
        total_count = cls.count_by_user(data_user)
        
        # 按武器类型统计
        sql = """
            SELECT [weapon_type], COUNT(*) as count
            FROM steam_stockComponents
            WHERE [data_user] = ?
            GROUP BY [weapon_type]
            ORDER BY count DESC
        """
        type_stats = db.execute_query(sql, (data_user,))
        
        return {
            'total_count': total_count,
            'weapon_type_stats': [
                {'weapon_type': row[0], 'count': row[1]}
                for row in type_stats
            ]
        }

    @classmethod
    def get_price_statistics(cls, data_user: str = None) -> Dict[str, Any]:
        """获取价格统计信息"""
        db = cls().db
        
        if data_user:
            sql = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CAST([buy_price] AS REAL)) as total_buy_price,
                    AVG(CAST([buy_price] AS REAL)) as avg_buy_price,
                    SUM(CAST([yyyp_price] AS REAL)) as total_yyyp_price,
                    SUM(CAST([buff_price] AS REAL)) as total_buff_price,
                    SUM(CAST([steam_price] AS REAL)) as total_steam_price
                FROM steam_stockComponents
                WHERE [data_user] = ? AND [buy_price] IS NOT NULL
            """
            result = db.execute_query(sql, (data_user,))
        else:
            sql = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CAST([buy_price] AS REAL)) as total_buy_price,
                    AVG(CAST([buy_price] AS REAL)) as avg_buy_price,
                    SUM(CAST([yyyp_price] AS REAL)) as total_yyyp_price,
                    SUM(CAST([buff_price] AS REAL)) as total_buff_price,
                    SUM(CAST([steam_price] AS REAL)) as total_steam_price
                FROM steam_stockComponents
                WHERE [buy_price] IS NOT NULL
            """
            result = db.execute_query(sql, ())
        
        if result and result[0][0] > 0:
            row = result[0]
            return {
                'total': row[0],
                'total_buy_price': row[1] or 0,
                'avg_buy_price': row[2] or 0,
                'total_yyyp_price': row[3] or 0,
                'total_buff_price': row[4] or 0,
                'total_steam_price': row[5] or 0
            }
        
        return {
            'total': 0,
            'total_buy_price': 0,
            'avg_buy_price': 0,
            'total_yyyp_price': 0,
            'total_buff_price': 0,
            'total_steam_price': 0
        }
