"""
IGXE message Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/igxe/API.py 接收前缀 /backENDV2/src/use_spider/igxe
- 定义所有 message 路由，添加 /message/ 路径段
完整 URL 格式: /backENDV2/src/use_spider/igxe/message/<endpoint>
"""
from flask import Blueprint
from .units.message_handler import MessageHandler

message_spider_blueprint = Blueprint("igxe_message_spider", __name__)

# 查询类路由
message_spider_blueprint.route("/message/getLatest/<user_id>", methods=["GET"])(MessageHandler.get_latest)

# 写入类路由
message_spider_blueprint.route("/message/insert_db", methods=["POST"])(MessageHandler.insert_db)
message_spider_blueprint.route("/message/batch_insert", methods=["POST"])(MessageHandler.batch_insert)
