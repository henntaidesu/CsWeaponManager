"""
use_spider 聚合 API 模块
层级蓝图注册：
- 从 src/API.py 接收前缀 /backENDV2/src
- 向下传递给各平台模块，添加 /use_spider/<platform> 路径段
最终形成完整路径示例：
/backENDV2/src/use_spider/youpin/<module>/<endpoint>
/backENDV2/src/use_spider/buff/<module>/<endpoint>
/backENDV2/src/use_spider/csfloat/<module>/<endpoint>
/backENDV2/src/use_spider/steam/<module>/<endpoint>
/backENDV2/src/use_spider/prefect_world/<module>/<endpoint>
"""
from flask import Blueprint
from .youpin.API import youpin_spider_blueprint
from .buff.API import buff_spider_blueprint
from .csfloat.API import csfloat_spider_blueprint
from .steam.API import steam_spider_blueprint
from .prefect_world.API import prefect_world_spider_blueprint
from .csqaq.API import csqaq_spider_blueprint
from .c5game.API import c5game_spider_blueprint
from .igxe.API import igxe_spider_blueprint

use_spider_blueprint = Blueprint('use_spider', __name__)

use_spider_blueprint.register_blueprint(youpin_spider_blueprint,       url_prefix='/use_spider/youpin')
use_spider_blueprint.register_blueprint(buff_spider_blueprint,         url_prefix='/use_spider/buff')
use_spider_blueprint.register_blueprint(csfloat_spider_blueprint,      url_prefix='/use_spider/csfloat')
use_spider_blueprint.register_blueprint(steam_spider_blueprint,        url_prefix='/use_spider/steam')
use_spider_blueprint.register_blueprint(prefect_world_spider_blueprint,url_prefix='/use_spider/prefect_world')
use_spider_blueprint.register_blueprint(csqaq_spider_blueprint,         url_prefix='/use_spider/csqaq')
use_spider_blueprint.register_blueprint(c5game_spider_blueprint,        url_prefix='/use_spider/c5game')
use_spider_blueprint.register_blueprint(igxe_spider_blueprint,          url_prefix='/use_spider/igxe')