"""
IgxeMessageBox API 模块
层级蓝图注册：
- 从 settings/API.py 接收前缀 /backENDV2/src/use_webside/settings
- 注册所有 IgxeMessageBox 路由，添加 /igxe_message_box/units/data/xxx 路径段
"""
from flask import Blueprint
from .units.igxe_message_box_data import IgxeMessageBoxData

igxe_message_box_blueprint = Blueprint('igxe_message_box_v2', __name__)

igxe_message_box_blueprint.route('/igxe_message_box/units/data/getMessageData/<int:page>/<int:limit>', methods=['GET'])(IgxeMessageBoxData.get_message_data)
igxe_message_box_blueprint.route('/igxe_message_box/units/data/getMessageCategories', methods=['GET'])(IgxeMessageBoxData.get_message_categories)
