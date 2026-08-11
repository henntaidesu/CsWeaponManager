"""
On Sale API 模块
层级蓝图注册：
- 从 use_webside/API.py 接收前缀 /backENDV2/src/use_webside
- 注册所有 On Sale 页面路由，添加 /on_sale/units/xxx 路径段
"""
from flask import Blueprint
from .units.accounts import OnSaleAccounts
from .units.items import OnSaleItems

on_sale_blueprint = Blueprint('on_sale_v2', __name__)

# 账号查询路由
on_sale_blueprint.route('/on_sale/units/accounts/getYYYPAccounts', methods=['GET'])(OnSaleAccounts.get_yyyp_accounts)
on_sale_blueprint.route('/on_sale/units/accounts/getBuffAccounts', methods=['GET'])(OnSaleAccounts.get_buff_accounts)

# 商品操作路由
on_sale_blueprint.route('/on_sale/units/items/getOnSaleItems', methods=['POST'])(OnSaleItems.get_on_sale_items)
on_sale_blueprint.route('/on_sale/units/items/removeFromSale', methods=['POST'])(OnSaleItems.remove_from_sale)
on_sale_blueprint.route('/on_sale/units/items/updateSalePrice', methods=['POST'])(OnSaleItems.update_sale_price)
