# -*- coding: utf-8 -*-
"""
数据库管理模块
提供现代化的对象关系映射和自动表结构管理
"""

from .database import DatabaseManager
from .base_model import BaseModel
from .manager import DBManager, init_database, get_db_manager

# 导入所有模型
from .index import ConfigModel, FundsModel, BuyModel, SellModel, LeaseModel
from .yyyp import YyypBuyModel
from .steam import SteamBuyModel, SteamSellModel, SteamInventoryHistoryModel, SteamInventoryModel, SteamStockComponentsModel

__all__ = [
    'DatabaseManager', 
    'BaseModel',
    'DBManager',
    'init_database',
    'get_db_manager',
    'ConfigModel',
    'FundsModel', 
    'BuyModel',
    'SellModel',
    'LeaseModel',
    'YyypBuyModel',
    'SteamBuyModel',
    'SteamSellModel',
    'SteamInventoryHistoryModel',
    'SteamInventoryModel',
    'SteamStockComponentsModel'
]
