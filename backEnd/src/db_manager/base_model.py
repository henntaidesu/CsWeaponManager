# -*- coding: utf-8 -*-
"""
数据库模型基础类
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Type
from datetime import datetime
from .database import DatabaseManager


class BaseModel(ABC):
    """数据库模型基础类"""
    
    def __init__(self, **kwargs):
        """初始化模型实例"""
        self.db = DatabaseManager()
        self._data = {}
        self._original_data = {}
        
        # 设置字段值
        for field_name, field_def in self.get_fields().items():
            value = kwargs.get(field_name, field_def.get('default'))
            # 处理空字符串，将其转换为 None
            if isinstance(value, str) and value.strip() == '':
                value = None
            self._data[field_name] = value
            self._original_data[field_name] = value
    
    @classmethod
    @abstractmethod
    def get_table_name(cls) -> str:
        """获取表名"""
        pass
    
    @classmethod
    @abstractmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        """获取字段定义"""
        pass
    
    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        """获取索引定义"""
        return []
    
    def __getattr__(self, name: str):
        """获取字段值"""
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    def __setattr__(self, name: str, value):
        """设置字段值"""
        if name.startswith('_') or name in ['db']:
            super().__setattr__(name, value)
        elif hasattr(self, '_data') and name in self.get_fields():
            # 处理空字符串，将其转换为 None
            if isinstance(value, str) and value.strip() == '':
                value = None
            self._data[name] = value
        else:
            super().__setattr__(name, value)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return self._data.copy()
    
    def save(self) -> bool:
        """保存到数据库"""
        if self._is_new_record():
            return self._insert()
        else:
            return self._update()
    
    def delete(self) -> bool:
        """从数据库删除"""
        primary_keys = self._get_primary_keys()
        if not primary_keys:
            return False
        
        where_conditions = []
        params = []
        for key in primary_keys:
            where_conditions.append(f"[{key}] = ?")
            params.append(self._data[key])
        
        sql = f"DELETE FROM {self.get_table_name()} WHERE {' AND '.join(where_conditions)}"
        
        try:
            affected_rows = self.db.execute_update(sql, tuple(params))
            return affected_rows > 0
        except Exception as e:
            print(f"删除记录失败: {e}")
            return False
    
    @classmethod
    def delete_all(cls, where_clause: str = None, params: tuple = None) -> int:
        """
        删除满足条件的所有记录
        
        Args:
            where_clause: WHERE 子句（不包含 WHERE 关键字）
            params: 参数元组
        
        Returns:
            int: 删除的记录数
        """
        from .database import DatabaseManager
        db = DatabaseManager()
        
        table_name = cls.get_table_name()
        sql = f"DELETE FROM {table_name}"
        
        if where_clause:
            sql += f" WHERE {where_clause}"
        
        try:
            if params:
                affected_rows = db.execute_update(sql, params)
            else:
                affected_rows = db.execute_update(sql)
            return affected_rows
        except Exception as e:
            print(f"删除 {table_name} 数据失败: {e}")
            return 0
    
    def _is_new_record(self) -> bool:
        """判断是否为新记录"""
        primary_keys = self._get_primary_keys()
        if not primary_keys:
            return True
        
        # 检查主键是否都有值
        for key in primary_keys:
            if not self._data.get(key):
                return True
        
        # 检查数据库中是否存在该记录
        where_conditions = []
        params = []
        for key in primary_keys:
            where_conditions.append(f"[{key}] = ?")
            params.append(self._data[key])
        
        sql = f"SELECT 1 FROM {self.get_table_name()} WHERE {' AND '.join(where_conditions)} LIMIT 1"
        
        try:
            result = self.db.execute_query(sql, tuple(params))
            return len(result) == 0
        except Exception:
            return True
    
    def _insert(self) -> bool:
        """插入新记录"""
        fields = []
        placeholders = []
        params = []
        
        for field_name, value in self._data.items():
            # 处理 None 和空字符串，将它们都转换为 None（数据库中的 NULL）
            if value is not None and (not isinstance(value, str) or value.strip() != ''):
                fields.append(field_name)
                placeholders.append('?')
                params.append(value)
        
        # 对字段名进行转义以处理保留关键字
        escaped_fields = [f'[{field}]' for field in fields]
        sql = f"INSERT INTO {self.get_table_name()} ({', '.join(escaped_fields)}) VALUES ({', '.join(placeholders)})"
        
        try:
            self.db.execute_insert(sql, tuple(params))
            # 更新原始数据
            self._original_data = self._data.copy()
            return True
        except Exception as e:
            print(f"[错误] 插入记录失败 - 表: {self.get_table_name()}, 错误: {e}")
            return False
    
    def _update(self) -> bool:
        """更新现有记录"""
        primary_keys = self._get_primary_keys()
        if not primary_keys:
            return False
        
        # 找出已更改的字段
        changed_fields = []
        params = []
        
        for field_name, value in self._data.items():
            if field_name not in primary_keys and value != self._original_data.get(field_name):
                # 对字段名进行转义以处理保留关键字
                changed_fields.append(f"[{field_name}] = ?")
                # 处理空字符串，将其转换为 None（数据库中的 NULL）
                if isinstance(value, str) and value.strip() == '':
                    params.append(None)
                else:
                    params.append(value)
        
        if not changed_fields:
            return True  # 没有更改
        
        # 添加WHERE条件
        where_conditions = []
        for key in primary_keys:
            where_conditions.append(f"[{key}] = ?")
            params.append(self._original_data[key])
        
        sql = f"UPDATE {self.get_table_name()} SET {', '.join(changed_fields)} WHERE {' AND '.join(where_conditions)}"
        
        try:
            affected_rows = self.db.execute_update(sql, tuple(params))
            if affected_rows > 0:
                # 更新原始数据
                self._original_data = self._data.copy()
                return True
            return False
        except Exception as e:
            print(f"更新记录失败: {e}")
            return False
    
    def _get_primary_keys(self) -> List[str]:
        """获取主键字段"""
        primary_keys = []
        for field_name, field_def in self.get_fields().items():
            if field_def.get('primary_key', False):
                primary_keys.append(field_name)
        return primary_keys
    
    @classmethod
    def find_by_id(cls, **primary_key_values):
        """根据主键查找记录"""
        instance = cls()
        primary_keys = instance._get_primary_keys()
        
        if not primary_keys or len(primary_key_values) != len(primary_keys):
            return None
        
        where_conditions = []
        params = []
        for key in primary_keys:
            if key not in primary_key_values:
                return None
            where_conditions.append(f"[{key}] = ?")
            params.append(primary_key_values[key])
        
        sql = f"SELECT * FROM {cls.get_table_name()} WHERE {' AND '.join(where_conditions)} LIMIT 1"
        
        try:
            result = instance.db.execute_query(sql, tuple(params))
            if result:
                return cls._create_from_row(result[0])
            return None
        except Exception as e:
            print(f"查找记录失败: {e}")
            return None
    
    @classmethod
    def find_all(cls, where: str = "", params: tuple = (), limit: int = None, offset: int = None, order_by: str = None):
        """查找多条记录"""
        sql = f"SELECT * FROM {cls.get_table_name()}"
        
        if where:
            sql += f" WHERE {where}"
        
        if order_by:
            sql += f" ORDER BY {order_by}"
        
        if limit:
            sql += f" LIMIT {limit}"
            if offset:
                sql += f" OFFSET {offset}"
        
        try:
            instance = cls()
            result = instance.db.execute_query(sql, params)
            return [cls._create_from_row(row) for row in result]
        except Exception as e:
            print(f"查找记录失败: {e}")
            return []
    
    @classmethod
    def count(cls, where: str = "", params: tuple = ()) -> int:
        """统计记录数"""
        sql = f"SELECT COUNT(*) FROM {cls.get_table_name()}"
        
        if where:
            sql += f" WHERE {where}"
        
        try:
            instance = cls()
            result = instance.db.execute_query(sql, params)
            return result[0][0] if result else 0
        except Exception as e:
            print(f"统计记录失败: {e}")
            return 0
    
    @classmethod
    def _get_table_column_names(cls) -> List[str]:
        """获取数据库中真实的列顺序并缓存"""
        cache_attr = '_cached_table_columns'
        if not hasattr(cls, cache_attr):
            instance = cls()
            columns = instance.db.get_table_columns(cls.get_table_name())
            setattr(cls, cache_attr, [col['name'] for col in columns])
        return getattr(cls, cache_attr)

    @classmethod
    def _create_from_row(cls, row: tuple):
        """从数据库行创建模型实例"""
        table_columns = cls._get_table_column_names()
        field_defs = cls.get_fields()
        kwargs = {}

        for idx, column_name in enumerate(table_columns):
            if idx >= len(row):
                break
            if column_name not in field_defs:
                continue
            value = row[idx]
            if isinstance(value, str) and value.strip() == '':
                value = None
            kwargs[column_name] = value
        
        instance = cls(**kwargs)
        instance._original_data = instance._data.copy()
        return instance
    
    @classmethod
    def ensure_table_exists(cls) -> bool:
        """确保表存在，如果不存在则创建"""
        db = DatabaseManager()
        
        if db.table_exists(cls.get_table_name()):
            # 检查字段是否完整
            return cls._check_and_update_table_structure()
        else:
            # 创建新表
            return cls._create_table()
    
    @classmethod
    def _create_table(cls) -> bool:
        """创建表"""
        db = DatabaseManager()
        
        # 转换字段定义格式
        columns = []
        for field_name, field_def in cls.get_fields().items():
            columns.append({
                'name': field_name,
                'type': field_def['type'],
                'primary_key': field_def.get('primary_key', False),
                'not_null': field_def.get('not_null', False),
                'default': field_def.get('default'),
                'autoincrement': field_def.get('autoincrement', False),
                'mysql_type': field_def.get('mysql_type'),
                'length': field_def.get('length')
            })
        
        return db.create_table(cls.get_table_name(), columns, cls.get_indexes())
    
    @classmethod
    def _check_and_update_table_structure(cls) -> bool:
        """检查并更新表结构：添加缺失字段，删除多余字段"""
        db = DatabaseManager()
        table_name = cls.get_table_name()
        
        # 获取现有列
        existing_columns = {col['name']: col for col in db.get_table_columns(table_name)}
        
        # 获取模型定义的字段
        defined_fields = set(cls.get_fields().keys())
        existing_field_names = set(existing_columns.keys())
        
        # 检查缺失的列并添加
        for field_name, field_def in cls.get_fields().items():
            if field_name not in existing_columns:
                print(f"表 {table_name} 缺少字段 {field_name}，正在添加...")
                column_def = {
                    'name': field_name,
                    'type': field_def['type'],
                    'not_null': field_def.get('not_null', False),
                    'default': field_def.get('default'),
                    'mysql_type': field_def.get('mysql_type'),
                    'length': field_def.get('length')
                }
                
                if not db.add_column(table_name, column_def):
                    print(f"添加字段 {field_name} 失败")
                    return False
        
        # 检查多余的列并删除（排除主键列）
        extra_columns = existing_field_names - defined_fields
        for column_name in extra_columns:
            # 检查是否是主键列，主键列不能删除
            column_info = existing_columns.get(column_name, {})
            if column_info.get('pk', False):
                print(f"表 {table_name} 的字段 {column_name} 是主键，跳过删除")
                continue
            
            print(f"表 {table_name} 存在多余字段 {column_name}，正在删除...")
            if not db.drop_column(table_name, column_name):
                print(f"删除字段 {column_name} 失败")
                return False
        
        return True
