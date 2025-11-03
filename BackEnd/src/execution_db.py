import sys
import os
from src.log import Log, err2
from src.db_manager.database import DatabaseManager


class Date_base:

    def __init__(self):
        self.db = DatabaseManager()
        self.database_name = os.path.basename(self.db.db_path).replace('.db', '')
        self.print_log = Log()
    
    def get_database_name(self):
        return self.database_name

    def insert(self, sql):
        try:
            sql = sql.replace("'None'", "NULL")
            self.db.execute_insert(sql)
            return True
        except Exception as e:
            error_str = str(e).upper()
            if "PRIMARY" in error_str or "UNIQUE" in error_str:
                self.print_log.write_log(f"重复数据 {sql}", 'warning')
                return '重复数据'
            elif "timed out" in str(e).lower():
                self.print_log.write_log("连接数据库超时", 'error')
                return 'timed out'
            else:
                err2(e)
                self.print_log.write_log(f"错误 {sql}", 'warning')
                return False

    def update(self, sql):
        try:
            self.db.execute_update(sql)
            return True
        except Exception as e:
            err2(e)
            if "timed out" in str(e).lower():
                self.print_log.write_log("连接数据库超时", 'error')
            else:
                self.print_log.write_log(f'{sql}', 'error')
            return False

    def select(self, sql):
        try:
            result = self.db.execute_query(sql)
            return True, result
        except Exception as e:
            err2(e)
            if "timed out" in str(e).lower():
                self.print_log.write_log("连接数据库超时", 'error')
            else:
                self.print_log.write_log(f'{sql}', 'error')
            return False, None

    def delete(self, sql):
        try:
            result = self.db.execute_query(sql)
            self.db.execute_update(sql)
            return result
        except Exception as e:
            err2(e)
            if "timed out" in str(e).lower():
                self.print_log.write_log(f"连接数据库超时", 'error')
            self.print_log.write_log(sql, 'error')
            return None

    def system_sql(self, sql):
        try:
            self.db.execute_update(sql)
        except Exception as e:
            err2(e)
            if "timed out" in str(e).lower():
                self.print_log.write_log(f"连接数据库超时", 'error')
            self.print_log.write_log(sql, 'error')
    
    def execute_query(self, sql, params=()):
        """执行查询语句（支持参数化查询）"""
        try:
            result = self.db.execute_query(sql, params)
            return result
        except Exception as e:
            err2(e)
            if "timed out" in str(e).lower():
                self.print_log.write_log("连接数据库超时", 'error')
            else:
                self.print_log.write_log(f'{sql}', 'error')
            return None