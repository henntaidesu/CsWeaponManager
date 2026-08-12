"""
Settings API 模块
层级蓝图注册：
- 从 use_webside/API.py 接收前缀 /backENDV2/src/use_webside
- 向下传递给各设置子模块，添加 /settings 路径段
"""
from flask import Blueprint
from .data_source.API import data_source_blueprint
from .auto_manager.API import auto_manager_blueprint
from .steam_inventory_history.API import steam_inventory_history_blueprint
from .dev_tools.API import dev_tools_blueprint
from .system_settings.API import system_settings_blueprint
from .database_manager.API import database_manager_blueprint
from .yyyp_message_box.API import yyyp_message_box_blueprint
from .buff_message_box.API import buff_message_box_blueprint
from .igxe_message_box.API import igxe_message_box_blueprint
from .version_update.API import version_update_blueprint
from .steam_market.API import steam_market_blueprint
from .sys_message.API import sys_message_blueprint
settings_blueprint = Blueprint('settings_v2', __name__)
settings_blueprint.register_blueprint(data_source_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(auto_manager_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(steam_inventory_history_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(dev_tools_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(system_settings_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(database_manager_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(yyyp_message_box_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(buff_message_box_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(igxe_message_box_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(version_update_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(steam_market_blueprint, url_prefix='/settings')
settings_blueprint.register_blueprint(sys_message_blueprint, url_prefix='/settings')