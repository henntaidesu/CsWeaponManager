# -*- coding: utf-8 -*-
"""
库存盈亏每日快照表模型
- 每天为每个账号(data_user)记录一条:当前库存 + 在库组件的成本与各平台市值合计
- 与已实现配对盈亏(pnl_pairing)完全分开
- 库存(未实现)盈亏 = 市值合计 - 成本合计;成本统一取 buy_price
- 历史市值无法回算,故按天快照累积
"""

from typing import Dict, Any, List
from ...base_model import BaseModel


class PnlInventoryDailyModel(BaseModel):
    """库存盈亏每日快照"""

    @classmethod
    def get_table_name(cls) -> str:
        return "pnl_inventory_daily"

    @classmethod
    def get_fields(cls) -> Dict[str, Dict[str, Any]]:
        return {
            'id': {'type': 'INTEGER', 'primary_key': True, 'not_null': True},
            'snapshot_date': {'type': 'TEXT', 'not_null': True, 'comment': '快照日期 YYYY-MM-DD'},
            'data_user': {'type': 'TEXT', 'not_null': True, 'comment': '账号(Steam ID)'},
            # 库存(steam_inventory, if_inventory=1)
            'inv_count': {'type': 'INTEGER', 'not_null': False, 'default': 0, 'comment': '库存件数'},
            'inv_cost': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '库存成本合计'},
            'inv_yyyp': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '库存悠悠市值合计'},
            'inv_buff': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '库存BUFF市值合计'},
            'inv_steam': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '库存Steam市值合计'},
            # 在库组件(steam_stockComponents)
            'comp_count': {'type': 'INTEGER', 'not_null': False, 'default': 0, 'comment': '组件件数'},
            'comp_cost': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '组件成本合计'},
            'comp_yyyp': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '组件悠悠市值合计'},
            'comp_buff': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '组件BUFF市值合计'},
            'comp_steam': {'type': 'REAL', 'not_null': False, 'default': 0, 'comment': '组件Steam市值合计'},
            'created_at': {'type': 'DATETIME', 'not_null': False, 'default': 'CURRENT_TIMESTAMP'},
            'updated_at': {'type': 'DATETIME', 'not_null': False, 'default': 'CURRENT_TIMESTAMP'},
        }

    @classmethod
    def get_indexes(cls) -> List[Dict[str, Any]]:
        return [
            {'name': 'pnl_inv_daily_idx_date_user', 'columns': ['snapshot_date', 'data_user']},
            {'name': 'pnl_inv_daily_idx_date', 'columns': ['snapshot_date']},
        ]
