import sqlite3
import configparser
import os
import sys


class read_conf:
    config = None

    def __init__(self):
        # 如果配置信息尚未加载，则加载配置文件
        if not read_conf.config:
            read_conf.config = self._load_config()

    def _get_base_path(self):
        """获取程序基础路径（兼容 exe 打包）"""
        if getattr(sys, 'frozen', False):
            # 打包后的 exe，使用 exe 所在目录
            return os.path.dirname(sys.executable)
        else:
            # 开发环境，使用当前文件所在目录的上两级（BackEnd 目录）
            return os.path.dirname(os.path.dirname(__file__))

    def _load_config(self):
        self.config = configparser.ConfigParser()
        # 使用基础路径拼接配置文件路径
        config_path = os.path.join(self._get_base_path(), 'conf.ini')
        self.config.read(config_path, encoding='utf-8')
        return self.config

    def database(self):
        """连接 SQLite 数据库"""
        # SQLite 配置
        sqlite_file = self.config.get('database', 'sqlite_file', fallback='csweaponmanager.db')
        # 确保 SQLite 文件路径是绝对路径
        if not os.path.isabs(sqlite_file):
            # 使用基础路径（exe 所在目录或开发环境的 BackEnd 目录）
            sqlite_file = os.path.join(self._get_base_path(), sqlite_file)
        
        db = sqlite3.connect(sqlite_file, check_same_thread=False, timeout=30.0)
        # 启用 WAL 模式以减少锁定问题
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('PRAGMA synchronous=NORMAL')
        db.execute('PRAGMA cache_size=1000')
        db.execute('PRAGMA temp_store=MEMORY')
        # 不设置 row_factory，保持返回元组格式以兼容 JSON 序列化
        database_name = os.path.basename(sqlite_file)
        return db, database_name

    def http_proxy(self):
        if_true = self.config.get('http_proxy', 'true')
        host = self.config.get('http_proxy', 'host')
        port = self.config.get('http_proxy', 'port')
        proxy_url = "http://" + host + ":" + port

        proxies = {
            "http": proxy_url,
            "https": proxy_url,
        }

        # print(type(if_true))
        if if_true == "True":
            return True, proxies
        else:
            return False, proxies

    def log_level(self):
        level = self.config.get('LogLevel', 'level')
        return level

    def processes(self):
        number = self.config.get('processes', 'number')
        return number

    def get_database_name(self):
        sqlite_file = self.config.get('database', 'sqlite_file', fallback='csweaponmanager.db')
        return os.path.basename(sqlite_file)

