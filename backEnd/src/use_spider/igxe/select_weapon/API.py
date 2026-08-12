"""
IGXE select_weapon Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/igxe/API.py 接收前缀 /backENDV2/src/use_spider/igxe
- 定义所有 selectWeapon 路由，添加 /selectWeapon/ 路径段
完整 URL 格式: /backENDV2/src/use_spider/igxe/selectWeapon/<endpoint>
"""
from flask import Blueprint
from .units.product_insert import ProductInsert

select_weapon_spider_blueprint = Blueprint("igxe_select_weapon_spider", __name__)

# 写入/更新类路由
select_weapon_spider_blueprint.route("/selectWeapon/batchInsertOrUpdate", methods=["POST"])(ProductInsert.batch_insert_or_update)
