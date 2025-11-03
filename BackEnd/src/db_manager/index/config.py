# -*- coding: utf-8 -*-
"""
配置表模型
"""

from typing import Dict, Any
from ..base_model import BaseModel


class ConfigModel(BaseModel):
    """配置表模型"""
    
    @classmethod
    def get_table_name(cls) -> str:
        return "config"
    
    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'dataID': {
                'type': 'INTEGER',
                'primary_key': True,
                'autoincrement': True,
                'not_null': True
            },
            'dataName': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'key1': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'key2': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'value': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'status': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'steamID': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'Steam ID'
            }
        }
    
    @classmethod
    def find_by_keys(cls, key1: str, key2: str):
        """根据key1和key2查找配置"""
        return cls.find_all("key1 = ? AND key2 = ?", (key1, key2))
    
    @classmethod
    def get_value(cls, key1: str, key2: str, default_value: str = None) -> str:
        """获取配置值"""
        configs = cls.find_by_keys(key1, key2)
        if configs:
            return configs[0].value
        return default_value
    
    @classmethod
    def set_value(cls, key1: str, key2: str, value: str, data_name: str = None) -> bool:
        """设置配置值"""
        configs = cls.find_by_keys(key1, key2)
        
        if configs:
            # 更新现有配置
            config = configs[0]
            config.value = value
            if data_name:
                config.dataName = data_name
            return config.save()
        else:
            # 创建新配置
            config = cls(
                key1=key1,
                key2=key2,
                value=value,
                dataName=data_name,
                status='1'
            )
            return config.save()
