from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.now_time import today
import json

dataSourcePage = Blueprint('dataSourcePage', __name__)


@dataSourcePage.route('/api/datasource', methods=['GET'])
def get_datasources():
    """获取所有数据源"""
    try:
        db = Date_base()
        
        # 只查询key2='config'的配置记录，过滤掉其他配置项（如last_collect等）
        try:
            success, result = db.select("SELECT dataID, dataName, key1, key2, value, status, steamID FROM config WHERE key2 = 'config' ORDER BY dataID")
            has_steam_id_column = True
        except Exception as e:
            print(f"[WARNING] steamID列可能不存在，使用备用查询: {e}")
            success, result = db.select("SELECT dataID, dataName, key1, key2, value, status FROM config WHERE key2 = 'config' ORDER BY dataID")
            has_steam_id_column = False
        
        if success:
            # 按dataID和dataName分组数据
            datasource_groups = {}
            for row in result:
                if has_steam_id_column:
                    data_id, data_name, key1, key2, value, status, steam_id = row
                else:
                    data_id, data_name, key1, key2, value, status = row
                    steam_id = None
                
                # 创建唯一键
                key = f"{data_id}_{data_name}"
                
                if key not in datasource_groups:
                    from datetime import datetime
                    # key1字段存储数据源类型，dataName存储数据源名称
                    data_source_type = key1 if key1 else 'unknown'
                    datasource_groups[key] = {
                        'dataID': data_id,
                        'dataName': data_name,  # 数据源名称
                        'type': data_source_type,  # 数据源类型(从key1获取)
                        'config': {},
                        'status': status,
                        'enabled': status == '1',
                        'lastUpdate': None,  # 初始化为None，后面从config中提取
                        'updateFreq': '15min',
                        'steamID': ''  # 初始化为空，后面从config或字段中提取
                    }
                
                # 如果steamID字段有值，直接使用
                if steam_id:
                    datasource_groups[key]['steamID'] = steam_id
                
                # 确保每次都更新数据源类型，以防有多条记录
                if key1:
                    datasource_groups[key]['type'] = key1
                
                # 如果key2是'config'，说明value存储的是JSON配置
                if key2 == 'config' and value:
                    try:
                        import json
                        config_json = json.loads(value)
                        if isinstance(config_json, dict):
                            # 如果steamID字段为空，尝试从config中提取
                            if not datasource_groups[key]['steamID']:
                                extracted_steam_id = (config_json.get('steamID') or 
                                                     config_json.get('steamId') or 
                                                     config_json.get('yyyp_steamId') or '')
                                if extracted_steam_id:
                                    datasource_groups[key]['steamID'] = extracted_steam_id
                            
                            # 提取lastUpdate时间
                            if 'lastUpdate' in config_json and config_json['lastUpdate']:
                                datasource_groups[key]['lastUpdate'] = config_json['lastUpdate']
                            else:
                                # 如果旧数据没有lastUpdate，自动添加并更新到数据库
                                from datetime import datetime
                                current_time = datetime.now().isoformat()
                                datasource_groups[key]['lastUpdate'] = current_time
                                config_json['lastUpdate'] = current_time
                                
                                # 更新数据库中的配置
                                try:
                                    updated_value = json.dumps(config_json).replace("'", "''")
                                    update_sql = f"UPDATE config SET value = '{updated_value}' WHERE dataID = {data_id} AND key2 = 'config'"
                                    db.update(update_sql)
                                    print(f"[自动迁移] 为 dataID={data_id} ({data_name}) 添加 lastUpdate: {current_time}")
                                except Exception as update_error:
                                    print(f"[自动迁移] 更新 lastUpdate 失败: {update_error}")
                            
                            # 为悠悠有品配置添加yyyp_前缀保持前端兼容性
                            if key1 == 'youpin':
                                for config_key, config_value in config_json.items():
                                    # 跳过lastUpdate，不存储到config中
                                    if config_key == 'lastUpdate':
                                        continue
                                    # 检查key是否已经有yyyp_前缀，避免重复添加
                                    if config_key.startswith('yyyp_'):
                                        # 已经有前缀，直接使用
                                        datasource_groups[key]['config'][config_key] = config_value
                                    else:
                                        # 没有前缀，添加前缀
                                        datasource_groups[key]['config'][f"yyyp_{config_key}"] = config_value
                            else:
                                # 其他数据源直接使用配置项（跳过lastUpdate）
                                for config_key, config_value in config_json.items():
                                    if config_key != 'lastUpdate':
                                        datasource_groups[key]['config'][config_key] = config_value
                    except json.JSONDecodeError:
                        # JSON解析失败，忽略该配置
                        pass
                # 兼容旧的存储格式
                elif key1 and key2 and key2 != 'config':
                    if key1 == 'youpin':
                        datasource_groups[key]['config'][f"yyyp_{key2}"] = value
                    else:
                        datasource_groups[key]['config'][key2] = value
                    
                    # 特殊处理sleep_time字段转换为更新频率
                    if key2 == 'sleep_time' and value:
                        try:
                            sleep_seconds = int(value)
                            if sleep_seconds <= 300:  # 5分钟以内
                                datasource_groups[key]['updateFreq'] = f"{sleep_seconds}s"
                            elif sleep_seconds <= 3600:  # 1小时以内
                                minutes = sleep_seconds // 60
                                datasource_groups[key]['updateFreq'] = f"{minutes}min"
                            elif sleep_seconds <= 86400:  # 1天以内
                                hours = sleep_seconds // 3600
                                datasource_groups[key]['updateFreq'] = f"{hours}hour"
                            else:
                                days = sleep_seconds // 86400
                                datasource_groups[key]['updateFreq'] = f"{days}day"
                        except (ValueError, TypeError):
                            datasource_groups[key]['updateFreq'] = '15min'
                # 如果只有key1，作为单个配置项存储
                elif key1 and not key2:
                    datasource_groups[key]['config'][key1] = value
                # 如果只有value且没有key1和key2，可能是JSON配置
                elif not key1 and not key2 and value:
                    try:
                        import json
                        json_config = json.loads(value)
                        if isinstance(json_config, dict):
                            datasource_groups[key]['config'].update(json_config)
                    except:
                        pass
                
                # 更新状态信息（取最新的）
                if status is not None:
                    datasource_groups[key]['status'] = status
                    datasource_groups[key]['enabled'] = status == '1'
            
            datasources = list(datasource_groups.values())
            
            return jsonify({
                'success': True,
                'data': datasources,
                'message': '获取数据源成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': '查询数据源失败'
            }), 500
            
    except Exception as e:
        Log().write_log(f"获取数据源失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource', methods=['POST'])
def add_datasource():
    """添加新数据源"""
    try:
        data = request.get_json()
        
        if not data or not data.get('dataName'):
            return jsonify({
                'success': False,
                'message': '数据源名称不能为空'
            }), 400
        
        # 获取当前最大的dataID
        db = Date_base()
        success, result = db.select("SELECT MAX(dataID) FROM config")
        
        max_id = 0
        if success and result and result[0][0] is not None:
            max_id = result[0][0]
        
        new_id = max_id + 1
        
        # 将数据源类型存储在key1字段中
        data_type = data.get('type', '')
        data_name = data['dataName'].replace("'", "''")  # 转义单引号
        status = '1' if data.get('enabled', True) else '0'
        
        # 获取配置JSON字符串
        config_json = data.get('configJson', '{}')
        config_json_escaped = config_json.replace("'", "''")
        
        # 从配置JSON中提取steamID（支持不同的字段名）
        steam_id = ''
        try:
            config_data = json.loads(config_json)
            # 尝试不同的字段名：steamID, steamId, yyyp_steamId
            steam_id = (config_data.get('steamID') or 
                       config_data.get('steamId') or 
                       config_data.get('yyyp_steamId') or '')
        except:
            pass
        steam_id_escaped = steam_id.replace("'", "''") if steam_id else ''
        
        # 插入单条记录，包含所有信息
        insert_sql = f"""
        INSERT INTO config (dataID, dataName, key1, key2, value, status, steamID) 
        VALUES ({new_id}, '{data_name}', '{data_type}', 'config', '{config_json_escaped}', '{status}', '{steam_id_escaped}')
        """
        
        db = Date_base()
        result = db.insert(insert_sql)
        
        if not result:
            return jsonify({
                'success': False,
                'message': '添加数据源失败'
            }), 500
        
        return jsonify({
            'success': True,
            'message': '数据源添加成功',
            'data': {
                'dataID': new_id,
                'dataName': data['dataName'],
                'type': data_type,
                'configJson': config_json,
                'status': status,
                'enabled': data.get('enabled', True)
            }
        }), 201
            
    except Exception as e:
        Log().write_log(f"添加数据源失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource/<int:data_id>', methods=['GET'])
def get_datasource_by_id(data_id):
    """获取单个数据源详细信息"""
    try:
        db = Date_base()
        
        # 查询指定dataID的配置
        select_sql = f"SELECT dataID, dataName, key1, key2, value, status, steamID FROM config WHERE dataID = {data_id} AND key2 = 'config'"
        success, result = db.select(select_sql)
        
        if not success or not result:
            return jsonify({
                'success': False,
                'message': f'未找到 dataID={data_id} 的数据源'
            }), 404
        
        # 解析数据
        data_id, data_name, data_type, key2, value, status, steam_id = result[0]
        
        # 解析配置JSON
        config_json = {}
        try:
            config_json = json.loads(value) if value else {}
        except:
            pass
        
        # 构建响应数据
        datasource = {
            'dataID': data_id,
            'dataName': data_name,
            'type': data_type,
            'enabled': status == '1',
            'steamID': steam_id or '',
            'config': config_json
        }
        
        return jsonify({
            'success': True,
            'data': datasource
        }), 200
        
    except Exception as e:
        Log().write_log(f"获取数据源失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource/<int:data_id>', methods=['PUT'])
def update_datasource(data_id):
    """更新数据源"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400
        
        db = Date_base()
        data_name = data.get('dataName', '').replace("'", "''")
        data_type = data.get('type', '')
        status = '1' if data.get('enabled', True) else '0'
        
        # 获取配置JSON字符串
        config_json = data.get('configJson', '{}')
        config_json_escaped = config_json.replace("'", "''")
        
        # 从配置JSON中提取steamID（支持不同的字段名）
        steam_id = ''
        try:
            config_data = json.loads(config_json)
            # 尝试不同的字段名：steamID, steamId, yyyp_steamId
            steam_id = (config_data.get('steamID') or 
                       config_data.get('steamId') or 
                       config_data.get('yyyp_steamId') or '')
        except Exception as parse_error:
            pass
        steam_id_escaped = steam_id.replace("'", "''") if steam_id else ''
        
        # 直接更新单条记录
        update_sql = f"""
        UPDATE config 
        SET dataName = '{data_name}', key1 = '{data_type}', value = '{config_json_escaped}', status = '{status}', steamID = '{steam_id_escaped}' 
        WHERE dataID = {data_id} AND key2 = 'config'
        """
        
        result = db.update(update_sql)
        
        if not result:
            return jsonify({
                'success': False,
                'message': '更新数据源失败'
            }), 500
        
        return jsonify({
            'success': True,
            'message': '数据源更新成功'
        }), 200
            
    except Exception as e:
        Log().write_log(f"更新数据源失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource/<int:data_id>', methods=['DELETE'])
def delete_datasource(data_id):
    """删除数据源"""
    try:
        # 首先检查数据源是否存在
        check_sql = f"SELECT COUNT(*) FROM config WHERE dataID = {data_id}"
        
        db = Date_base()
        success, result = db.select(check_sql)
        
        if not success or not result or result[0][0] == 0:
            return jsonify({
                'success': False,
                'message': '数据源不存在'
            }), 404
        
        # 使用update方法执行DELETE语句（因为delete方法有问题）
        delete_sql = f"DELETE FROM config WHERE dataID = {data_id}"
        
        db = Date_base()
        result = db.update(delete_sql)  # 使用update方法来执行DELETE
        
        if result:
            return jsonify({
                'success': True,
                'message': '数据源删除成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': '删除数据源失败'
            }), 500
            
    except Exception as e:
        Log().write_log(f"删除数据源失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource/<int:data_id>/toggle', methods=['PUT'])
def toggle_datasource_status(data_id):
    """切换数据源启用状态"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', True)
        status = '1' if enabled else '0'
        
        update_sql = f"UPDATE config SET status = '{status}' WHERE dataID = {data_id}"
        
        db = Date_base()
        result = db.update(update_sql)
        
        if result:
            return jsonify({
                'success': True,
                'message': f'数据源已{"启用" if enabled else "禁用"}'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': '更新状态失败'
            }), 500
            
    except Exception as e:
        Log().write_log(f"切换数据源状态失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource/test', methods=['POST'])
def test_datasource_connection():
    """测试数据源连接"""
    try:
        data = request.get_json()
        
        # 这里可以根据数据源类型实现具体的连接测试逻辑
        # 目前返回模拟结果
        
        datasource_type = data.get('type', '')
        api_url = data.get('apiUrl', '')
        
        if not api_url:
            return jsonify({
                'success': False,
                'message': 'API地址不能为空'
            }), 400
        
        # 模拟连接测试
        import time
        time.sleep(1)  # 模拟测试延迟
        
        # 这里可以添加真实的连接测试逻辑
        # 比如发送HTTP请求到API地址
        
        return jsonify({
            'success': True,
            'message': '连接测试成功',
            'data': {
                'latency': '150ms',
                'status': 'online'
            }
        }), 200
        
    except Exception as e:
        Log().write_log(f"测试数据源连接失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'连接测试失败: {str(e)}'
        }), 500


@dataSourcePage.route('/api/datasource/<int:data_id>/collect', methods=['POST'])
def collect_datasource(data_id):
    """启动数据源采集"""
    try:
        data = request.get_json()
        
        # 首先验证数据源是否存在且启用
        check_sql = f"SELECT dataName, status FROM config WHERE dataID = {data_id} LIMIT 1"
        
        db = Date_base()
        success, result = db.select(check_sql)
        
        if not success or not result:
            return jsonify({
                'success': False,
                'message': '数据源不存在'
            }), 404
            
        data_name = result[0][0]
        status = result[0][1]
        
        if status != '1':
            return jsonify({
                'success': False,
                'message': '数据源未启用，无法采集'
            }), 400
        
        Log().write_log(f"开始采集数据源: {data_name} (ID: {data_id})", 'info')
        
        # 这里可以添加实际的采集逻辑
        # 根据不同的数据源类型调用不同的采集模块
        # 暂时返回模拟结果
        
        import random
        import time
        
        # 模拟采集时间
        time.sleep(2)
        
        # 模拟采集结果
        collected_count = random.randint(50, 500)
        
        # 更新数据源的最后更新时间（可选）
        from datetime import datetime
        update_sql = f"""
        UPDATE config SET value = CONCAT(IFNULL(value, ''), 
        ', last_collect: {datetime.now().isoformat()}') 
        WHERE dataID = {data_id} AND key2 = 'last_collect'
        """
        
        Log().write_log(f"采集完成: {data_name}, 采集到 {collected_count} 条数据", 'info')
        
        return jsonify({
            'success': True,
            'message': f'数据源 {data_name} 采集完成',
            'data': {
                'dataSourceId': data_id,
                'dataSourceName': data_name,
                'count': collected_count,
                'startTime': datetime.now().isoformat(),
                'status': 'completed'
            }
        }), 200
        
    except Exception as e:
        Log().write_log(f"采集数据源失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'采集失败: {str(e)}'
        }), 500