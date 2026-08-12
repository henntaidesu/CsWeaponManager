"""
Steam select_weapon Spider V2 API 模块
完整 URL 格式: /backENDV2/src/use_spider/steam/select_weapon/<endpoint>
"""
from flask import Blueprint
from .units.select_weapon_handler import SelectWeaponHandler

select_weapon_spider_blueprint = Blueprint('steam_select_weapon_spider', __name__)

select_weapon_spider_blueprint.route('/select_weapon/batchInsertSteamHashName', methods=['POST'])(SelectWeaponHandler.batch_insert_steam_hash_name)
select_weapon_spider_blueprint.route('/select_weapon/batchUpsertSteamMapping', methods=['POST'])(SelectWeaponHandler.batch_upsert_steam_mapping)
