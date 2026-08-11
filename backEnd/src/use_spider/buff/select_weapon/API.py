"""
BUFF select_weapon Spider V2 API 模块
层级蓝图注册：
- 从 use_spider/buff/API.py 接收前缀 /backENDV2/src/use_spider/buff
- 定义所有 selectWeapon 路由，添加 /selectWeapon/ 路径段
完整 URL 格式: /backENDV2/src/use_spider/buff/selectWeapon/<endpoint>
"""
from flask import Blueprint
from .units.weapon_insert import WeaponInsert
from .units.weapon_query import WeaponQuery

select_weapon_spider_blueprint = Blueprint('buff_select_weapon_spider', __name__)

# 写入/更新类路由
select_weapon_spider_blueprint.route('/selectWeapon/batchInsertOrUpdate', methods=['POST'])(WeaponInsert.batch_insert_or_update)

# 查询类路由
select_weapon_spider_blueprint.route('/selectWeapon/getBuffIdByHashName', methods=['POST'])(WeaponQuery.get_buff_id_by_hash_name)
