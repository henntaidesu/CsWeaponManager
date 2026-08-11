"""
IGXE buy Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/igxe/API.py 接收前缀 /backENDV2/src/use_spider/igxe
- 定义所有 buy 路由，添加 /buy/ 路径段
完整 URL 格式: /backENDV2/src/use_spider/igxe/buy/<endpoint>
"""
from flask import Blueprint
from .units.buy_insert import BuyInsert
from .units.buy_query import BuyQuery

buy_spider_blueprint = Blueprint("igxe_buy_spider", __name__)

# 查询类路由
buy_spider_blueprint.route("/buy/countData/<user_id>", methods=["GET"])(BuyQuery.count_data)
buy_spider_blueprint.route("/buy/getLatestData/<user_id>", methods=["GET"])(BuyQuery.get_latest_data)
buy_spider_blueprint.route("/buy/selectNotEnd/<user_id>", methods=["GET"])(BuyQuery.select_not_end)

# 写入/更新类路由
buy_spider_blueprint.route("/buy/insert_db", methods=["POST"])(BuyInsert.insert_db)
buy_spider_blueprint.route("/buy/updateOrderStatus", methods=["POST"])(BuyInsert.update_order_status)
