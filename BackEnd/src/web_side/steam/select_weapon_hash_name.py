# -*- coding: utf-8 -*-
"""
Steam武器Hash Name管理API
用于批量写入Steam市场物品的hash name到数据库
"""

from flask import jsonify, request, Blueprint
from src.db_manager.index.weapon_classID import WeaponClassIDModel

steamSelectWeaponHashNameV1 = Blueprint('steamSelectWeaponHashNameV1', __name__)


@steamSelectWeaponHashNameV1.route('/batchInsertSteamHashName', methods=['POST'])
def batchInsertSteamHashName():
    """
    批量插入或更新Steam Hash Name数据
    请求体格式：
    {
        "weapons": [
            {
                "data_hash_name": "AK-47 | Redline (Field-Tested)",
                "market_listing_item_name": "AK-47 | 红线 (久经沙场)",
                "weapon_type": "步枪",
                "weapon_name": "AK-47",
                "item_name": "红线"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'weapons' not in data:
            return jsonify({
                'success': False,
                'error': '请求数据格式错误，需要weapons字段'
            }), 400
        
        weapons = data['weapons']
        
        if not isinstance(weapons, list):
            return jsonify({
                'success': False,
                'error': 'weapons字段必须是数组'
            }), 400
        
        if len(weapons) == 0:
            return jsonify({
                'success': False,
                'error': 'weapons数组不能为空'
            }), 400
        
        # 批量插入或更新
        success_count = WeaponClassIDModel.batch_update_steam_hash_name(weapons)
        
        return jsonify({
            'success': True,
            'message': f'成功处理 {success_count} 条数据',
            'success_count': success_count,
            'total_count': len(weapons)
        }), 200
        
    except Exception as e:
        print(f"批量插入Steam Hash Name失败: {e}")
        import traceback
        print(f"错误堆栈: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

