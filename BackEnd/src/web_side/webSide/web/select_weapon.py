from flask import jsonify, request, Blueprint
from src.db_manager.index.weapon_classID import WeaponClassIDModel

webSelectWeaponV1 = Blueprint('webSelectWeaponV1', __name__)

@webSelectWeaponV1.route('/searchWeapon', methods=['GET'])
def searchWeapon():
    """
    根据market_listing_item_name模糊搜索武器（用于自动完成下拉框）
    参数: keyword - 搜索关键词
    返回: 匹配的武器名称列表（仅market_listing_item_name字段，限制20条）
    """
    try:
        keyword = request.args.get('keyword', '')
        
        if not keyword or len(keyword.strip()) == 0:
            return jsonify({
                "success": True,
                "data": []
            }), 200
        
        # 使用LIKE进行模糊查询
        where_clause = "[market_listing_item_name] LIKE ?"
        params = (f"%{keyword}%",)
        
        # 查询数据库，限制返回20条用于下拉建议
        records = WeaponClassIDModel.find_all(
            where=where_clause, 
            params=params,
            limit=20
        )
        
        # 提取market_listing_item_name字段
        results = []
        seen = set()  # 下拉框去重，避免重复显示
        for record in records:
            name = record.market_listing_item_name
            if name and name not in seen:
                results.append(name)
                seen.add(name)
        
        return jsonify({
            "success": True,
            "data": results
        }), 200
        
    except Exception as e:
        print(f"搜索武器失败: {e}")
        import traceback
        print(f"错误堆栈: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": str(e),
            "data": []
        }), 500


@webSelectWeaponV1.route('/searchWeaponDetail', methods=['GET'])
def searchWeaponDetail():
    """
    根据market_listing_item_name模糊搜索武器详细信息（用于表格展示）
    参数: keyword - 搜索关键词
    返回: 匹配的武器完整信息列表（所有字段，不限制数量，不去重）
    """
    try:
        keyword = request.args.get('keyword', '')
        
        if not keyword or len(keyword.strip()) == 0:
            return jsonify({
                "success": True,
                "data": [],
                "count": 0
            }), 200
        
        # 使用LIKE进行模糊查询
        where_clause = "[market_listing_item_name] LIKE ?"
        params = (f"%{keyword}%",)
        
        # 查询数据库，返回所有匹配的记录
        records = WeaponClassIDModel.find_all(
            where=where_clause, 
            params=params
        )
        
        # 返回完整的武器信息
        results = []
        for record in records:
            weapon_data = {
                'steam_hash_name': record.steam_hash_name,
                'market_listing_item_name': record.market_listing_item_name,
                'yyyp_id': record.yyyp_id,
                'buff_id': record.buff_id,
                'steam_id': record.steam_id,
                'yyyp_class_name': record.yyyp_class_name,
                'buff_class_name': record.buff_class_name,
                'weapon_type': record.weapon_type,
                'weapon_name': record.weapon_name,
                'item_name': record.item_name,
                'float_range': record.float_range,
                'Rarity': record.Rarity
            }
            results.append(weapon_data)
        
        return jsonify({
            "success": True,
            "data": results,
            "count": len(results)
        }), 200
        
    except Exception as e:
        print(f"搜索武器详情失败: {e}")
        import traceback
        print(f"错误堆栈: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": str(e),
            "data": [],
            "count": 0
        }), 500

