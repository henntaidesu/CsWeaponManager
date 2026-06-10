"""
Data Source API 模块
层级蓝图注册：
- 从 use_webside/API.py 接收前缀 /backENDV2/src/use_webside
- 注册所有 Data Source 页面路由，添加 /data_source/units/xxx 路径段
"""
from flask import Blueprint
from .units.data_source_data import DataSourceData
from .units.data_source_ops import DataSourceOps
from .units.weapon_query import WeaponQuery
from .units.csqaq_handler import CsqaqHandler
from .units.steamdt_handler import SteamDTHandler
from .units.item_search_handler import ItemSearchHandler

data_source_blueprint = Blueprint('data_source_v2', __name__)

# 数据源CRUD路由
data_source_blueprint.route('/data_source/units/data/getDataSourceList', methods=['GET'])(DataSourceData.get_data_source_list)
data_source_blueprint.route('/data_source/units/data/createDataSource', methods=['POST'])(DataSourceData.create_data_source)
data_source_blueprint.route('/data_source/units/data/getDataSourceById/<int:data_id>', methods=['GET'])(DataSourceData.get_data_source_by_id)
data_source_blueprint.route('/data_source/units/data/updateDataSource/<int:data_id>', methods=['PUT'])(DataSourceData.update_data_source)
data_source_blueprint.route('/data_source/units/data/deleteDataSource/<int:data_id>', methods=['DELETE'])(DataSourceData.delete_data_source)

# 数据源操作路由
data_source_blueprint.route('/data_source/units/ops/testConnection', methods=['POST'])(DataSourceOps.test_connection)
data_source_blueprint.route('/data_source/units/ops/collectDataSource/<int:data_id>', methods=['POST'])(DataSourceOps.collect_data_source)
data_source_blueprint.route('/data_source/units/ops/toggleDataSource/<int:data_id>', methods=['PUT'])(DataSourceOps.toggle_data_source)
data_source_blueprint.route('/data_source/units/ops/updateC5AccessToken', methods=['POST'])(DataSourceOps.update_c5_access_token)
data_source_blueprint.route('/data_source/units/ops/pauseDataSource', methods=['POST'])(DataSourceOps.pause_data_source)

# 武器查询路由
data_source_blueprint.route('/data_source/units/weapon/search', methods=['GET'])(WeaponQuery.search_weapon)
data_source_blueprint.route('/data_source/units/weapon/names', methods=['GET'])(WeaponQuery.get_weapon_names)
data_source_blueprint.route('/data_source/units/weapon/detail', methods=['GET'])(WeaponQuery.search_weapon_detail)
data_source_blueprint.route('/data_source/units/weapon/reference_prices', methods=['POST'])(WeaponQuery.get_reference_prices)
data_source_blueprint.route('/data_source/units/weapon/csqaq_id', methods=['POST'])(WeaponQuery.get_csqaq_id)
data_source_blueprint.route('/data_source/units/weapon/price_range', methods=['GET'])(WeaponQuery.query_weapons_by_price_range)

# CSQAQ 路由
data_source_blueprint.add_url_rule('/data_source/csqaq/upload_mapping', endpoint='csqaq_upload_mapping', view_func=CsqaqHandler.upload_mapping, methods=['POST'])
data_source_blueprint.add_url_rule('/data_source/csqaq/config', endpoint='csqaq_get_config', view_func=CsqaqHandler.get_config, methods=['GET'])

# SteamDT 路由
data_source_blueprint.add_url_rule('/data_source/steamdt/config', endpoint='steamdt_get_config', view_func=SteamDTHandler.get_config, methods=['GET'])

# 饰品搜索路由
data_source_blueprint.add_url_rule('/data_source/item_search/search', endpoint='item_search_search', view_func=ItemSearchHandler.search_items, methods=['POST'])
data_source_blueprint.add_url_rule('/data_source/item_search/weapon_names', endpoint='item_search_weapon_names', view_func=ItemSearchHandler.get_weapon_names, methods=['POST'])
data_source_blueprint.add_url_rule('/data_source/item_search/csqaq_detail', endpoint='item_search_csqaq_detail', view_func=ItemSearchHandler.get_csqaq_detail, methods=['GET'])
data_source_blueprint.add_url_rule('/data_source/item_search/batch_sticker_prices', endpoint='item_search_batch_sticker_prices', view_func=ItemSearchHandler.batch_sticker_prices, methods=['POST'])
