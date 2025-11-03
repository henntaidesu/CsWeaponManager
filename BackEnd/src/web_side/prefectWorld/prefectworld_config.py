from flask import jsonify, request, Blueprint
from src.db_manager.database import DatabaseManager

prefectWorldConfigV1 = Blueprint('prefectWorldConfigV1', __name__)


@prefectWorldConfigV1.route('/config/<steam_id>', methods=['GET'])
def get_prefectworld_config(steam_id):
    try:
        print(f"[DEBUG] 查询完美世界配置，Steam ID: {steam_id}")
        db = DatabaseManager()
        sql = """
        SELECT value FROM config 
        WHERE key1 = 'perfectworld'
        """
        
        results = db.execute_query(sql)
        print(f"[DEBUG] 查询到 {len(results) if results else 0} 条完美世界配置记录")
        
        if not results:
            print("[ERROR] 未找到任何完美世界配置")
            return jsonify({
                'success': False,
                'error': '未找到完美世界配置'
            }), 404
        
        # 遍历所有完美世界配置，找到匹配的steamID
        import json
        for idx, row in enumerate(results):
            value = row[0]
            print(f"[DEBUG] 处理第 {idx + 1} 条配置，value类型: {type(value)}")
            if value:
                try:
                    # 如果value已经是字典，直接使用；否则解析JSON
                    if isinstance(value, str):
                        config_data = json.loads(value)
                    else:
                        config_data = value
                    
                    config_steam_id = config_data.get('steamID')
                    print(f"[DEBUG] 配置中的Steam ID: {config_steam_id}")
                    
                    # 检查steamID是否匹配
                    if config_steam_id == steam_id:
                        print(f"[INFO] 找到匹配的完美世界配置")
                        return jsonify({
                            'success': True,
                            'data': {
                                'steamId': config_steam_id,
                                'appversion': config_data.get('appversion', ''),
                                'device': config_data.get('device', ''),
                                'gameType': config_data.get('gameType', ''),
                                'platform': config_data.get('platform', ''),
                                'token': config_data.get('token', ''),
                                'tdSign': config_data.get('tdSign', ''),
                                'dataName': config_data.get('dataName', ''),
                                'status': config_data.get('status', '1')
                            }
                        }), 200
                except json.JSONDecodeError as je:
                    print(f"[ERROR] JSON解析失败: {str(je)}")
                    continue
                except Exception as e:
                    print(f"[ERROR] 处理配置数据失败: {str(e)}")
                    continue
        
        print(f"[ERROR] 未找到Steam ID为 {steam_id} 的完美世界配置")
        return jsonify({
            'success': False,
            'error': f'未找到Steam ID为 {steam_id} 的完美世界配置'
        }), 404
            
    except Exception as e:
        print(f"[ERROR] 获取完美世界配置失败: {e}")
        import traceback
        print(f"[ERROR] 详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500

