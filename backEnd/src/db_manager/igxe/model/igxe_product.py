# -*- coding: utf-8 -*-
"""
IGXE饰品映射表模型

字段对应 APK 5.6.2 home/search_product 返回的 SearchProductResult.rows。
IGXE 只给中文 market_name，不给 market_hash_name，因此 steam_hash_name
由入库时按中文名反查 weapon_classID 得到，查不到就留空。
"""

from typing import Dict, Any, List
from ...base_model import BaseModel


class IgxeProductModel(BaseModel):
    """IGXE饰品映射表模型（product_id ↔ steam_hash_name）"""

    @classmethod
    def get_table_name(cls) -> str:
        return "igxe_product"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'product_id': {
                'type': 'INTEGER',
                'primary_key': True,
                'not_null': True,
                'comment': 'IGXE饰品ID，home/search_product 的 product_id'
            },
            'market_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': 'IGXE中文名，如 蝴蝶刀（★） | 北方森林 (久经沙场)'
            },
            'steam_hash_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None,
                'comment': '按中文名反查 weapon_classID 得到，查不到为空'
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
            'product_type_id': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None,
                'comment': '所属分类ID，来自 product/steam_product_classify'
            },
            'product_type_name': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'min_price': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'sale_count': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            },
            'icon_url': {
                'type': 'TEXT',
                'not_null': False,
                'default': None
            },
            'app_id': {
                'type': 'INTEGER',
                'not_null': False,
                'default': None
            }
        }

    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {
                'name': 'idx_igxe_product_hash_name',
                'columns': ['steam_hash_name']
            },
            {
                'name': 'idx_igxe_product_type_id',
                'columns': ['product_type_id']
            },
            {
                'name': 'idx_igxe_product_market_name',
                'columns': ['market_name']
            }
        ]

    @classmethod
    def batch_insert_or_update(cls, product_list: List[Dict[str, Any]]) -> int:
        """
        批量插入或更新IGXE饰品映射（按 product_id UPSERT）

        :param product_list: 每项含 product_id、market_name、steam_hash_name 等字段
        :return: 成功处理的数量
        """
        columns = [
            'market_name', 'steam_hash_name', 'weapon_type', 'weapon_name',
            'item_name', 'float_range', 'product_type_id', 'product_type_name',
            'min_price', 'sale_count', 'icon_url', 'app_id',
        ]

        success_count = 0
        insert_count = 0
        update_count = 0
        skip_count = 0
        db = cls().db

        for product_data in product_list:
            try:
                product_id = product_data.get('product_id')
                if not product_id:
                    skip_count += 1
                    continue

                values = [product_data.get(column) for column in columns]

                if cls.find_by_product_id(product_id):
                    set_clause = ', '.join(f"[{column}] = ?" for column in columns)
                    sql_update = f'''UPDATE {cls.get_table_name()}
                                     SET {set_clause}
                                     WHERE [product_id] = ?'''
                    # 值没变时 affected_rows 为 0，但记录已是目标状态，同样算成功，
                    # 否则重复同步时统计数会大幅偏低
                    db.execute_update(sql_update, tuple(values + [product_id]))
                    success_count += 1
                    update_count += 1
                else:
                    column_clause = ', '.join(f"[{column}]" for column in ['product_id'] + columns)
                    placeholders = ', '.join(['?'] * (len(columns) + 1))
                    sql_insert = f'''INSERT INTO {cls.get_table_name()}
                                     ({column_clause}) VALUES ({placeholders})'''
                    db.execute_insert(sql_insert, tuple([product_id] + values))
                    success_count += 1
                    insert_count += 1

            except Exception as e:
                print(f"处理IGXE饰品映射失败: product_id={product_data.get('product_id')}, 错误: {e}")
                continue

        print(f"IGXE饰品映射入库完成: 总成功 {success_count} 条 "
              f"(插入 {insert_count} 条, 更新 {update_count} 条), 跳过 {skip_count} 条")
        return success_count

    @classmethod
    def find_by_product_id(cls, product_id: int):
        """根据IGXE饰品ID查询"""
        return cls.find_all(where="[product_id] = ?", params=(product_id,))

    @classmethod
    def find_by_steam_hash_name(cls, steam_hash_name: str):
        """根据Steam Hash Name查询"""
        return cls.find_all(where="[steam_hash_name] = ?", params=(steam_hash_name,))
