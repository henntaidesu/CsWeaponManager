"""
use_webside API 模块
层级蓝图注册：
- 从 src/API.py 接收前缀 /backENDV2/src
- 向下传递给各页面模块，添加 /use_webside 路径段
"""
from flask import Blueprint
from .home.API import home_blueprint
from .buy.API import buy_blueprint
from .sell.API import sell_blueprint
from .rental.API import rental_blueprint
from .lent.API import lent_blueprint
from .on_sale.API import on_sale_blueprint
from .inventory.API import inventory_blueprint
from .stock_components.API import stock_components_blueprint
from .settings.API import settings_blueprint
from .Units.images.API import images_blueprint
from .data_spider.API import data_spider_blueprint
from .pnl.API import pnl_blueprint

web_display_blueprint = Blueprint('web_display', __name__)
web_display_blueprint.register_blueprint(home_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(buy_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(sell_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(rental_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(lent_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(on_sale_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(inventory_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(stock_components_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(settings_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(images_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(data_spider_blueprint, url_prefix='/use_webside')
web_display_blueprint.register_blueprint(pnl_blueprint, url_prefix='/use_webside')
