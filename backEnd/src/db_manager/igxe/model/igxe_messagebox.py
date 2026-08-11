# -*- coding: utf-8 -*-
"""
IGXE消息表模型

字段对应 APK 5.6.2 cn/igxe/entity/result/UserNewsResult.java 的 UserNewsItem，
数据来自 news/list（交易消息）与 news/system/news（系统公告）。
"""

from typing import Dict, Any, List
from ...base_model import BaseModel


class IgxeMessageboxModel(BaseModel):
    """IGXE消息表模型"""

    @classmethod
    def get_table_name(cls) -> str:
        return "igxe_messagebox"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'message_id': {
                'type': 'TEXT',
                'primary_key': True,
                'not_null': True
            },
            'category': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None,
                'comment': '消息分类，news/list 的 category'
            },
            'title': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'content': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'biz_id': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '关联业务号（多为订单号）'
            },
            'biz_type': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'product_id': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'app_id': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'url': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'is_read': {
                'type': 'INTEGER',
                'not_null': False,
                'default': 0
            },
            'createTime': {
                'type': 'DATETIME',
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
                'name': 'igxe_messagebox_idx',
                'columns': ['category', 'is_read', 'createTime', 'biz_id']
            }
        ]
