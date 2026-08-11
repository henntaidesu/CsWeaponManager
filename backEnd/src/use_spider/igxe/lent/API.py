"""
IGXE lent Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/igxe/API.py 接收前缀 /backENDV2/src/use_spider/igxe
- 定义所有 lent 路由，添加 /lent/ 路径段
完整 URL 格式: /backENDV2/src/use_spider/igxe/lent/<endpoint>
"""
from flask import Blueprint
from .units.lent_handler import LentHandler

lent_spider_blueprint = Blueprint("igxe_lent_spider", __name__)

# 查询类路由
lent_spider_blueprint.route("/lent/countData/<data_user>", methods=["GET"])(LentHandler.count_data)
lent_spider_blueprint.route("/lent/getLatestData/<data_user>", methods=["GET"])(LentHandler.get_latest_data)
lent_spider_blueprint.route("/lent/selectNotEnd/<data_user>", methods=["GET"])(LentHandler.select_not_end)

# 写入/更新类路由
lent_spider_blueprint.route("/lent/insert_db", methods=["POST"])(LentHandler.insert_db)
lent_spider_blueprint.route("/lent/updateOrderStatus", methods=["POST"])(LentHandler.update_order_status)
