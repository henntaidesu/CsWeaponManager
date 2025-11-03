# -*- coding: utf-8 -*-
"""
数据库管理核心类
"""

import sqlite3
import os
import sys
import threading
from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Tuple
from ..read_conf import read_conf


class DatabaseManager:
    """数据库管理器 - 单例模式"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.config = read_conf()
            self.db_path = self._get_db_path()
            self.initialized = True
            self._setup_database()
    
    def _get_db_path(self) -> str:
        """获取数据库文件路径（兼容 exe 打包）"""
        sqlite_file = self.config.config.get('database', 'sqlite_file', fallback='csweaponmanager.db')
        if not os.path.isabs(sqlite_file):
            # 获取基础路径
            if getattr(sys, 'frozen', False):
                # 打包后的 exe，使用 exe 所在目录
                base_path = os.path.dirname(sys.executable)
            else:
                # 开发环境，使用 BackEnd 目录
                base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            sqlite_file = os.path.join(base_path, sqlite_file)
        return sqlite_file
    
    def _setup_database(self):
        """设置数据库配置"""
        print(f"📁 数据库文件路径: {self.db_path}")
        with self.get_connection() as conn:
            # 启用 WAL 模式以减少锁定问题
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute('PRAGMA synchronous=NORMAL')
            conn.execute('PRAGMA cache_size=1000')
            conn.execute('PRAGMA temp_store=MEMORY')
            conn.execute('PRAGMA foreign_keys=ON')
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """获取数据库连接上下文管理器"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False, timeout=30.0)
        try:
            yield conn
        finally:
            conn.close()
    
    def execute_query(self, sql: str, params: tuple = ()) -> List[tuple]:
        """执行查询语句"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            return cursor.fetchall()
    
    def execute_update(self, sql: str, params: tuple = ()) -> int:
        """执行更新语句，返回受影响的行数"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            conn.commit()
            return cursor.rowcount
    
    def execute_insert(self, sql: str, params: tuple = ()) -> Optional[int]:
        """执行插入语句，返回最后插入的行ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            conn.commit()
            return cursor.lastrowid
    
    def execute_many(self, sql: str, params_list: List[tuple]) -> int:
        """执行批量操作"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(sql, params_list)
            conn.commit()
            return cursor.rowcount
    
    def table_exists(self, table_name: str) -> bool:
        """检查表是否存在"""
        sql = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        result = self.execute_query(sql, (table_name,))
        return len(result) > 0
    
    def get_table_columns(self, table_name: str) -> List[Dict[str, Any]]:
        """获取表的列信息"""
        if not self.table_exists(table_name):
            return []
        
        sql = f"PRAGMA table_info({table_name})"
        result = self.execute_query(sql)
        
        columns = []
        for row in result:
            columns.append({
                'cid': row[0],
                'name': row[1],
                'type': row[2],
                'notnull': bool(row[3]),
                'default_value': row[4],
                'pk': bool(row[5])
            })
        return columns
    
    def create_table(self, table_name: str, columns: List[Dict[str, Any]], 
                    indexes: List[Dict[str, Any]] = None) -> bool:
        """创建表"""
        try:
            # 构建创建表的SQL
            column_defs = []
            primary_keys = []

            # 先收集所有主键
            for col in columns:
                if col.get('primary_key'):
                    primary_keys.append(f'[{col["name"]}]')

            # 生成列定义
            for col in columns:
                # 对列名使用方括号以处理保留字
                col_name = f'[{col["name"]}]'
                col_def = f"{col_name} {col['type']}"

                # 只有单个主键时才在列定义中加 PRIMARY KEY
                if col.get('primary_key') and len(primary_keys) == 1:
                    col_def += " PRIMARY KEY"
                if col.get('not_null'):
                    col_def += " NOT NULL"
                if col.get('default') is not None:
                    col_def += f" DEFAULT {col['default']}"
                column_defs.append(col_def)

            # 处理复合主键（在表级别定义）
            if len(primary_keys) > 1:
                column_defs.append(f"PRIMARY KEY ({', '.join(primary_keys)})")

            sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(column_defs)})"
            self.execute_update(sql)
            
            # 创建索引
            if indexes:
                for idx in indexes:
                    idx_name = idx.get('name', f"idx_{table_name}_{idx['columns'][0]}")
                    idx_cols = ', '.join([f'[{col}]' for col in idx['columns']])
                    idx_sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ({idx_cols})"
                    self.execute_update(idx_sql)
            
            return True
        except Exception as e:
            print(f"创建表 {table_name} 失败: {e}")
            return False
    
    def add_column(self, table_name: str, column_def: Dict[str, Any]) -> bool:
        """添加列到现有表"""
        try:
            col_sql = f"[{column_def['name']}] {column_def['type']}"
            if column_def.get('not_null'):
                col_sql += " NOT NULL"
            if column_def.get('default') is not None:
                col_sql += f" DEFAULT {column_def['default']}"
            
            sql = f"ALTER TABLE {table_name} ADD COLUMN {col_sql}"
            self.execute_update(sql)
            return True
        except Exception as e:
            print(f"添加列到表 {table_name} 失败: {e}")
            return False
    
    def get_database_info(self) -> Dict[str, Any]:
        """获取数据库信息"""
        info = {
            'db_path': self.db_path,
            'tables': []
        }
        
        # 获取所有表
        sql = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        tables = self.execute_query(sql)
        
        for table in tables:
            table_name = table[0]
            columns = self.get_table_columns(table_name)
            info['tables'].append({
                'name': table_name,
                'columns': columns
            })
        
        return info
