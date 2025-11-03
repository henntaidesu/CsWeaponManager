# -*- coding: utf-8 -*-
"""
数据库管理器 - 统一管理所有表模型
"""

from typing import List, Type
from .base_model import BaseModel
from .database import DatabaseManager

# 导入所有模型
from .index import ConfigModel, FundsModel, BuyModel, SellModel, LeaseModel, WeaponClassIDModel
from .yyyp import YyypBuyModel, YyypSellModel, YyypLentModel, YyypMessageboxModel
from .buff import BuffBuyModel, BuffSellModel, BuffLentModel
from .steam import SteamBuyModel, SteamSellModel, SteamInventoryHistoryModel, SteamInventoryHistoryIndexModel, SteamInventoryModel, SteamStockComponentsModel


class DBManager:
    """数据库管理器 - 统一管理所有表"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.models = self._get_all_models()
    
    def _get_all_models(self) -> List[Type[BaseModel]]:
        """获取所有模型类"""
        return [
            # 基础表
            ConfigModel,
            FundsModel, 
            BuyModel,
            SellModel,
            LeaseModel,
            WeaponClassIDModel,  # 武器ClassID映射表（统一管理）
            
            # YYYP表
            YyypBuyModel,
            YyypSellModel,
            YyypLentModel,
            YyypMessageboxModel,

            # buff表
            BuffBuyModel,
            BuffSellModel,
            BuffLentModel,
            
            # Steam表
            SteamBuyModel,
            SteamSellModel,
            SteamInventoryHistoryModel,
            SteamInventoryHistoryIndexModel,
            SteamInventoryModel,
            SteamStockComponentsModel,
        ]
    
    def initialize_database(self) -> bool:
        """初始化数据库 - 按顺序检查并创建所有表"""
        print("正在初始化数据库...")

        success_count = 0
        total_count = len(self.models)
        failed_tables = []

        for model_class in self.models:
            try:
                table_name = model_class.get_table_name()

                if model_class.ensure_table_exists():
                    success_count += 1
                else:
                    failed_tables.append(table_name)
                    print(f"❌ 表 {table_name} 检查失败")

            except Exception as e:
                table_name = model_class.get_table_name()
                failed_tables.append(table_name)
                print(f"❌ 表 {table_name} 初始化异常: {e}")

        # 显示最终结果
        if success_count == total_count:
            print(f"✅ 数据库初始化成功: {success_count}/{total_count} 个表")
        else:
            print(f"⚠️  数据库初始化完成: {success_count}/{total_count} 个表成功")
            print(f"❌ 失败的表: {', '.join(failed_tables)}")
            return False

        return True
    
    def get_database_info(self):
        """获取数据库信息"""
        return self.db.get_database_info()
    
    def check_table_integrity(self) -> bool:
        """检查所有表的完整性"""
        print("正在检查表完整性...")
        
        for model_class in self.models:
            table_name = model_class.get_table_name()
            
            if not self.db.table_exists(table_name):
                # print(f"❌ 表 {table_name} 不存在")
                return False
            
            # 检查字段完整性
            existing_columns = {col['name'] for col in self.db.get_table_columns(table_name)}
            required_columns = set(model_class.get_fields().keys())
            
            missing_columns = required_columns - existing_columns
            if missing_columns:
                # print(f"❌ 表 {table_name} 缺少字段: {missing_columns}")
                return False
            
            # print(f"✅ 表 {table_name} 完整性检查通过")
        
        print("✅ 所有表完整性检查通过")
        return True
    
    def repair_tables(self) -> bool:
        """修复表结构"""
        print("正在修复表结构...")
        
        for model_class in self.models:
            try:
                if not model_class.ensure_table_exists():
                    # print(f"❌ 修复表 {model_class.get_table_name()} 失败")
                    return False
            except Exception as e:
                # print(f"❌ 修复表 {model_class.get_table_name()} 异常: {e}")
                return False
        
        print("✅ 表结构修复完成")
        return True
    
    def get_statistics(self) -> dict:
        """获取数据库统计信息"""
        stats = {
            'tables': {},
            'total_records': 0
        }
        
        for model_class in self.models:
            table_name = model_class.get_table_name()
            try:
                count = model_class.count()
                stats['tables'][table_name] = count
                stats['total_records'] += count
            except Exception as e:
                print(f"获取表 {table_name} 统计信息失败: {e}")
                stats['tables'][table_name] = 0
        
        return stats


# 全局数据库管理器实例
db_manager = DBManager()

# 初始化状态标志
_database_initialized = False


def init_database():
    """初始化数据库的便捷函数"""
    global _database_initialized
    if _database_initialized:
        print("数据库已初始化，跳过重复初始化")
        return True

    result = db_manager.initialize_database()
    if result:
        _database_initialized = True
    return result


def get_db_manager() -> DBManager:
    """获取数据库管理器实例"""
    return db_manager
