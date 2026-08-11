"""
IGXE rental Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/igxe/API.py 接收前缀 /backENDV2/src/use_spider/igxe
- 定义所有 rental 路由，添加 /rental/ 路径段
完整 URL 格式: /backENDV2/src/use_spider/igxe/rental/<endpoint>
"""
from flask import Blueprint
from .units.rental_handler import RentalHandler

rental_spider_blueprint = Blueprint("igxe_rental_spider", __name__)

# 查询类路由
rental_spider_blueprint.route("/rental/countData/<data_user>", methods=["GET"])(RentalHandler.count_data)
rental_spider_blueprint.route("/rental/getLatestData/<data_user>", methods=["GET"])(RentalHandler.get_latest_data)
rental_spider_blueprint.route("/rental/selectNotEnd/<data_user>", methods=["GET"])(RentalHandler.select_not_end)

# 写入/更新类路由
rental_spider_blueprint.route("/rental/insert_db", methods=["POST"])(RentalHandler.insert_db)
rental_spider_blueprint.route("/rental/updateOrderStatus", methods=["POST"])(RentalHandler.update_order_status)
