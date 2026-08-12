"""
IGXE Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/API.py 接收前缀 /backENDV2/src/use_spider/igxe
- 向下传递给 buy、sell、lent、rental、message、select_weapon 子模块
"""
from flask import Blueprint
from .buy.API import buy_spider_blueprint
from .sell.API import sell_spider_blueprint
from .lent.API import lent_spider_blueprint
from .rental.API import rental_spider_blueprint
from .message.API import message_spider_blueprint
from .select_weapon.API import select_weapon_spider_blueprint

igxe_spider_blueprint = Blueprint("igxe_spider", __name__)

igxe_spider_blueprint.register_blueprint(buy_spider_blueprint)
igxe_spider_blueprint.register_blueprint(sell_spider_blueprint)
igxe_spider_blueprint.register_blueprint(lent_spider_blueprint)
igxe_spider_blueprint.register_blueprint(rental_spider_blueprint)
igxe_spider_blueprint.register_blueprint(message_spider_blueprint)
igxe_spider_blueprint.register_blueprint(select_weapon_spider_blueprint)
