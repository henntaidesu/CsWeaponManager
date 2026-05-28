"""
Pnl API 模块
层级蓝图注册:
- 从 use_webside/API.py 接收前缀 /backENDV2/src/use_webside
- 注册所有 Pnl 页面路由,添加 /pnl/units/xxx 路径段
"""
from flask import Blueprint
from .units.pnl_data import PnlData
from .units.pnl_ops import PnlOps

pnl_blueprint = Blueprint('pnl_v2', __name__)

# 数据查询路由
pnl_blueprint.route('/pnl/units/data/getCalendar', methods=['POST'])(PnlData.get_calendar)
pnl_blueprint.route('/pnl/units/data/getOverallStats', methods=['POST'])(PnlData.get_overall_stats)
pnl_blueprint.route('/pnl/units/data/getDailyDetail', methods=['POST'])(PnlData.get_daily_detail)
pnl_blueprint.route('/pnl/units/data/getOrphanSells', methods=['POST'])(PnlData.get_orphan_sells)
pnl_blueprint.route('/pnl/units/data/getCandidateBuys', methods=['POST'])(PnlData.get_candidate_buys)

# 筛选选项路由
pnl_blueprint.route('/pnl/units/filters/getDataUserList', methods=['GET'])(PnlData.get_data_user_list)

# 写操作路由
pnl_blueprint.route('/pnl/units/ops/runAutoPairing', methods=['POST'])(PnlOps.run_auto_pairing)
pnl_blueprint.route('/pnl/units/ops/manualPair', methods=['POST'])(PnlOps.manual_pair)
pnl_blueprint.route('/pnl/units/ops/unpair', methods=['POST'])(PnlOps.unpair)
pnl_blueprint.route('/pnl/units/ops/setExcluded', methods=['POST'])(PnlOps.set_excluded)
