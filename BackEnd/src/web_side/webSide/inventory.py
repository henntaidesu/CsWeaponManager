from flask import jsonify, request, Blueprint
from src.db_manager.steam.steam_inventory import SteamInventoryModel
from src.db_manager.database import DatabaseManager

webInventoryV1 = Blueprint('webInventoryV1', __name__)


def get_auto_price(item_name):
    """
    根据物品名称自动填充价格
    返回: float 价格，或 None（需要从buy表查询）
    """
    if not item_name:
        return None
    
    # 价格为0的物品关键词
    zero_price_keywords = ['赛季奖牌', '奖牌', '勋章', '徽章', '布章', '硬币']
    for keyword in zero_price_keywords:
        if keyword in item_name:
            return 0
    
    # 库存存储组件价格为14
    if '库存存储组件' in item_name:
        return 14
    
    # 其他物品返回None，需要从buy表查询
    return None

@webInventoryV1.route('/steam_ids', methods=['GET'])
def get_steam_ids():
    """从config表获取所有不同的Steam ID列表"""
    try:
        # 获取查询参数，判断是否只统计特定classid的物品
        classid_filter = request.args.get('classid', '')
        
        db = DatabaseManager()
        # 从config表中获取去重的steamID
        sql = """
        SELECT DISTINCT steamID
        FROM config 
        WHERE steamID IS NOT NULL AND steamID != ''
        ORDER BY steamID
        """
        results = db.execute_query(sql)
        
        steam_ids = []
        for row in results:
            steam_id = row[0]
            
            # 查询该steamID在库存中的物品数量
            if classid_filter:
                # 如果指定了classid，只统计该classid的物品数量
                count_sql = """
                SELECT COUNT(*) 
                FROM steam_inventory 
                WHERE data_user = ? AND if_inventory = '1' AND classid = ?
                """
                count_result = db.execute_query(count_sql, (steam_id, classid_filter))
            else:
                # 否则统计所有物品数量
                count_sql = """
                SELECT COUNT(*) 
                FROM steam_inventory 
                WHERE data_user = ? AND if_inventory = '1'
                """
                count_result = db.execute_query(count_sql, (steam_id,))
            
            item_count = count_result[0][0] if count_result else 0
            
            steam_ids.append({
                'steam_id': steam_id,
                'item_count': item_count
            })
        
        return jsonify({
            'success': True,
            'data': steam_ids
        }), 200
        
    except Exception as e:
        print(f"查询Steam ID列表失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500

@webInventoryV1.route('/inventory/<steam_id>', methods=['GET'])
def get_inventory(steam_id):
    """获取指定用户的库存列表"""
    try:
        # 获取查询参数
        search_text = request.args.get('search', '')
        weapon_type = request.args.get('weapon_type', '')
        float_range = request.args.get('float_range', '')
        classid = request.args.get('classid', '')  # 新增：classid筛选参数
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # 构建查询条件
        where_conditions = ["data_user = ?", "if_inventory = '1'"]  # 只查询在库存中的物品
        params = [steam_id]
        
        if search_text:
            where_conditions.append("(item_name LIKE ? OR weapon_name LIKE ?)")
            search_pattern = f"%{search_text}%"
            params.extend([search_pattern, search_pattern])
        
        if weapon_type:
            where_conditions.append("weapon_type = ?")
            params.append(weapon_type)
        
        if float_range:
            where_conditions.append("float_range = ?")
            params.append(float_range)
        
        if classid:
            where_conditions.append("classid = ?")
            params.append(classid)
        
        where_clause = " AND ".join(where_conditions)
        
        # 查询数据，使用自定义排序：未知物品放在最后
        from src.db_manager.database import DatabaseManager
        db = DatabaseManager()
        
        sql = f"""
        SELECT 
            si.assetid, si.instanceid, si.classid, si.item_name, si.weapon_name, si.float_range, 
            si.weapon_type, si.weapon_float, si.remark, si.data_user, si.buy_price, si.yyyp_price, si.buff_price, si.steam_price, si.order_time
        FROM {SteamInventoryModel.get_table_name()} si
        WHERE {where_clause.replace('data_user', 'si.data_user').replace('weapon_type', 'si.weapon_type').replace('float_range', 'si.float_range').replace('item_name', 'si.item_name').replace('weapon_name', 'si.weapon_name')}
        ORDER BY 
            CASE 
                WHEN si.weapon_type = '未知物品' THEN 1
                ELSE 0
            END,
            si.ROWID
        LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])
        results = db.execute_query(sql, tuple(params))
        
        # 将结果转换为模型对象和字典
        records = []
        if results:
            for row in results:
                # 优先读取steam_inventory表中的buy_price字段
                # 使用 is None 判断，因为 buy_price 可能为 "0"（字符串）
                buy_price_raw = row[10] if len(row) > 10 else None
                buy_price = buy_price_raw if buy_price_raw not in [None, '', 'None'] else None
                item_name = row[3]  # item_name
                
                # 只有当buy_price为空（None或空字符串）时，才进行后续处理
                if buy_price is None:
                    # 自动填充特殊物品价格
                    auto_price = get_auto_price(item_name)
                    
                    if auto_price is not None:
                        # 特殊物品，使用自动价格
                        buy_price = auto_price
                    else:
                        # 普通物品，从buy表查询
                        weapon_float = row[7]  # weapon_float
                        
                        if weapon_float:
                            # 有磨损值，查询精确匹配
                            price_sql = "SELECT price FROM buy WHERE item_name = ? AND weapon_float = ? LIMIT 1"
                            price_result = db.execute_query(price_sql, (item_name, weapon_float))
                            if price_result and len(price_result) > 0:
                                buy_price = price_result[0][0]
                        else:
                            # 没有磨损值，查询平均价格
                            avg_price_sql = "SELECT AVG(CAST(price AS REAL)) FROM buy WHERE item_name = ?"
                            avg_result = db.execute_query(avg_price_sql, (item_name,))
                            if avg_result and len(avg_result) > 0 and avg_result[0][0] is not None:
                                buy_price = round(avg_result[0][0], 2)
                    
                    # 如果有价格（自动填充或从buy表查到），更新到steam_inventory数据库
                    # 注意：buy_price可能为0（如勋章、硬币等），所以用 is not None 判断
                    if buy_price is not None:
                        update_sql = "UPDATE steam_inventory SET buy_price = ? WHERE assetid = ?"
                        affected = db.execute_update(update_sql, (buy_price, row[0]))
                        if affected > 0:
                            print(f"自动填充价格: {item_name} -> ¥{buy_price}")
                
                record = {
                    'assetid': row[0],
                    'instanceid': row[1],
                    'classid': row[2],
                    'item_name': row[3],
                    'weapon_name': row[4],
                    'float_range': row[5],
                    'weapon_type': row[6],
                    'weapon_float': row[7],
                    'remark': row[8],
                    'data_user': row[9],
                    'buy_price': buy_price,
                    'yyyp_price': row[11] if len(row) > 11 else None,
                    'buff_price': row[12] if len(row) > 12 else None,
                    'steam_price': row[13] if len(row) > 13 else None,
                    'order_time': row[14] if len(row) > 14 else None
                }
                records.append(record)
        
        # records 已经是字典列表了
        inventory_list = records
        
        # 获取总数 - 需要使用相同的where条件和参数，但排除limit和offset
        # 因为params在后面添加了limit和offset，所以需要去掉最后两个参数
        count_params = params[:-2] if len(params) >= 2 else params
        total = SteamInventoryModel.count(where_clause, tuple(count_params))
        
        return jsonify({
            'success': True,
            'data': inventory_list,
            'total': total
        }), 200
        
    except Exception as e:
        print(f"查询库存失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500


@webInventoryV1.route('/inventory/grouped/<steam_id>', methods=['GET'])
def get_grouped_inventory(steam_id):
    """获取按item_name分组的库存列表"""
    try:
        from src.db_manager.database import DatabaseManager
        
        db = DatabaseManager()
        
        # 查询分组数据，只查询在库存中的物品（if_inventory = '1'）
        sql = """
        SELECT 
            si.item_name,
            si.weapon_name,
            si.weapon_type,
            si.float_range,
            COUNT(*) as count,
            GROUP_CONCAT(si.assetid) as assetids,
            GROUP_CONCAT(si.weapon_float) as weapon_floats,
            GROUP_CONCAT(si.remark, '|||') as remarks,
            GROUP_CONCAT(si.buy_price) as buy_prices,
            GROUP_CONCAT(si.yyyp_price) as yyyp_prices,
            GROUP_CONCAT(si.buff_price) as buff_prices,
            GROUP_CONCAT(si.steam_price) as steam_prices,
            GROUP_CONCAT(si.order_time) as order_times
        FROM steam_inventory si
        WHERE si.data_user = ? AND si.if_inventory = '1'
        GROUP BY si.item_name, si.weapon_name, si.weapon_type, si.float_range
        ORDER BY 
            CASE 
                WHEN si.weapon_type = '未知物品' THEN 1
                ELSE 0
            END,
            si.item_name
        """
        
        results = db.execute_query(sql, (steam_id,))
        
        # 转换为字典列表
        grouped_list = []
        for row in results:
            item_name, weapon_name, weapon_type, float_range, count, assetids, weapon_floats, remarks, buy_prices, yyyp_prices, buff_prices, steam_prices, order_times = row
            
            # 分割字符串为列表
            assetid_list = assetids.split(',') if assetids else []
            float_list = weapon_floats.split(',') if weapon_floats else []
            remark_list = remarks.split('|||') if remarks else []
            price_list = buy_prices.split(',') if buy_prices else []
            yyyp_price_list = yyyp_prices.split(',') if yyyp_prices else []
            buff_price_list = buff_prices.split(',') if buff_prices else []
            steam_price_list = steam_prices.split(',') if steam_prices else []
            order_time_list = order_times.split(',') if order_times else []
            
            grouped_list.append({
                'item_name': item_name,
                'weapon_name': weapon_name,
                'weapon_type': weapon_type,
                'float_range': float_range,
                'count': count,
                'assetids': assetid_list,
                'weapon_floats': float_list,
                'remarks': remark_list,
                'buy_prices': price_list,
                'yyyp_prices': yyyp_price_list,
                'buff_prices': buff_price_list,
                'steam_prices': steam_price_list,
                'order_times': order_time_list
            })
        
        return jsonify({
            'success': True,
            'data': grouped_list,
            'total': len(grouped_list)
        }), 200
        
    except Exception as e:
        print(f"查询分组库存失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500


@webInventoryV1.route('/inventory/stats/<steam_id>', methods=['GET'])
def get_inventory_stats(steam_id):
    """获取库存统计信息"""
    try:
        from src.db_manager.database import DatabaseManager
        
        db = DatabaseManager()
        
        # 统计总数（只统计在库存中的物品）
        total_sql = "SELECT COUNT(*) FROM steam_inventory WHERE data_user = ? AND if_inventory = '1'"
        total_result = db.execute_query(total_sql, (steam_id,))
        total_count = total_result[0][0] if total_result else 0
        
        # 按武器类型统计（只统计在库存中的物品）
        type_sql = """
        SELECT weapon_type, COUNT(*) as count 
        FROM steam_inventory 
        WHERE data_user = ? AND if_inventory = '1' AND weapon_type IS NOT NULL AND weapon_type != ''
        GROUP BY weapon_type
        ORDER BY count DESC
        """
        type_results = db.execute_query(type_sql, (steam_id,))
        
        type_stats = []
        for row in type_results:
            weapon_type, count = row
            type_stats.append({
                'weapon_type': weapon_type,
                'count': count
            })
        
        # 按磨损等级统计（只统计在库存中的物品）
        wear_sql = """
        SELECT float_range, COUNT(*) as count 
        FROM steam_inventory 
        WHERE data_user = ? AND if_inventory = '1' AND float_range IS NOT NULL AND float_range != ''
        GROUP BY float_range
        ORDER BY count DESC
        """
        wear_results = db.execute_query(wear_sql, (steam_id,))
        
        wear_stats = []
        for row in wear_results:
            float_range, count = row
            wear_stats.append({
                'float_range': float_range,
                'count': count
            })
        
        # 统计购入价格总和（只统计在库存中的物品）
        price_sql = """
        SELECT 
            COUNT(CASE WHEN CAST(buy_price AS REAL) > 0 THEN 1 END) as priced_count,
            SUM(CAST(buy_price AS REAL)) as total_price,
            AVG(CAST(buy_price AS REAL)) as avg_price,
            MIN(CAST(buy_price AS REAL)) as min_price,
            MAX(CAST(buy_price AS REAL)) as max_price
        FROM steam_inventory
        WHERE data_user = ? AND if_inventory = '1'
        """
        price_result = db.execute_query(price_sql, (steam_id,))
        
        price_stats = {
            'priced_count': 0,
            'total_price': 0,
            'avg_price': 0,
            'min_price': 0,
            'max_price': 0
        }
        
        if price_result and len(price_result) > 0:
            priced_count, total_price, avg_price, min_price, max_price = price_result[0]
            price_stats = {
                'priced_count': priced_count if priced_count else 0,
                'total_price': round(total_price, 2) if total_price else 0,
                'avg_price': round(avg_price, 2) if avg_price else 0,
                'min_price': round(min_price, 2) if min_price else 0,
                'max_price': round(max_price, 2) if max_price else 0
            }
        
        # 统计悠悠有品价格总和
        yyyp_price_sql = """
        SELECT 
            COUNT(CASE WHEN CAST(yyyp_price AS REAL) > 0 THEN 1 END) as priced_count,
            SUM(CAST(yyyp_price AS REAL)) as total_price,
            AVG(CAST(yyyp_price AS REAL)) as avg_price
        FROM steam_inventory
        WHERE data_user = ? AND if_inventory = '1'
        """
        yyyp_price_result = db.execute_query(yyyp_price_sql, (steam_id,))
        
        yyyp_price_stats = {
            'priced_count': 0,
            'total_price': 0,
            'avg_price': 0
        }
        
        if yyyp_price_result and len(yyyp_price_result) > 0:
            priced_count, total_price, avg_price = yyyp_price_result[0]
            yyyp_price_stats = {
                'priced_count': priced_count if priced_count else 0,
                'total_price': round(total_price, 2) if total_price else 0,
                'avg_price': round(avg_price, 2) if avg_price else 0
            }
        
        # 统计BUFF价格总和
        buff_price_sql = """
        SELECT 
            COUNT(CASE WHEN CAST(buff_price AS REAL) > 0 THEN 1 END) as priced_count,
            SUM(CAST(buff_price AS REAL)) as total_price,
            AVG(CAST(buff_price AS REAL)) as avg_price
        FROM steam_inventory
        WHERE data_user = ? AND if_inventory = '1'
        """
        buff_price_result = db.execute_query(buff_price_sql, (steam_id,))
        
        buff_price_stats = {
            'priced_count': 0,
            'total_price': 0,
            'avg_price': 0
        }
        
        if buff_price_result and len(buff_price_result) > 0:
            priced_count, total_price, avg_price = buff_price_result[0]
            buff_price_stats = {
                'priced_count': priced_count if priced_count else 0,
                'total_price': round(total_price, 2) if total_price else 0,
                'avg_price': round(avg_price, 2) if avg_price else 0
            }
        
        return jsonify({
            'success': True,
            'data': {
                'total_count': total_count,
                'by_type': type_stats,
                'by_wear': wear_stats,
                'price_stats': price_stats,
                'yyyp_price_stats': yyyp_price_stats,
                'buff_price_stats': buff_price_stats
            }
        }), 200
        
    except Exception as e:
        print(f"查询统计信息失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500


@webInventoryV1.route('/inventory/buy_price/<steam_id>/<assetid>', methods=['PUT'])
def update_buy_price(steam_id, assetid):
    """更新库存物品的购入价格"""
    try:
        data = request.get_json()
        buy_price = data.get('buy_price', '')
        
        from src.db_manager.database import DatabaseManager
        db = DatabaseManager()
        
        sql = """
        UPDATE steam_inventory 
        SET buy_price = ? 
        WHERE data_user = ? AND assetid = ?
        """
        
        affected_rows = db.execute_update(sql, (buy_price, steam_id, assetid))
        
        if affected_rows > 0:
            return jsonify({
                'success': True,
                'message': '更新成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '未找到对应记录'
            }), 404
            
    except Exception as e:
        print(f"更新buy_price失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'更新失败: {str(e)}'
        }), 500


@webInventoryV1.route('/steam_config/<steam_id>', methods=['GET'])
def get_steam_config(steam_id):
    """根据Steam ID获取Steam配置（cookie等）"""
    try:
        print(f"[DEBUG] 查询Steam配置，Steam ID: {steam_id}")
        from src.db_manager.database import DatabaseManager
        db = DatabaseManager()
        
        # 查询config表，获取key1='steam'且key2='config'的记录
        sql = """
        SELECT value FROM config 
        WHERE key1 = 'steam' AND key2 = 'config'
        """
        
        results = db.execute_query(sql)
        print(f"[DEBUG] 查询到 {len(results) if results else 0} 条Steam配置记录")
        
        if not results:
            print("[ERROR] 未找到任何Steam配置")
            return jsonify({
                'success': False,
                'error': '未找到Steam配置'
            }), 404
        
        # 遍历所有steam配置，找到匹配的steamID
        import json
        for idx, row in enumerate(results):
            value = row[0]
            print(f"[DEBUG] 处理第 {idx + 1} 条配置...")
            if value:
                try:
                    config_data = json.loads(value)
                    config_steam_id = config_data.get('steamID')
                    print(f"[DEBUG] 配置中的Steam ID: {config_steam_id}")
                    
                    # 检查steamID是否匹配
                    if config_steam_id == steam_id:
                        print(f"[INFO] 找到匹配的Steam配置")
                        # Steam配置中使用 'cookies' 字段，不是 'cookie'
                        cookie = config_data.get('cookies', '') or config_data.get('cookie', '')
                        print(f"[DEBUG] Cookie长度: {len(cookie)}")
                        return jsonify({
                            'success': True,
                            'data': {
                                'steamId': config_steam_id,
                                'cookie': cookie,
                                'dataName': config_data.get('dataName', ''),
                                'status': config_data.get('status', '1')
                            }
                        }), 200
                except json.JSONDecodeError as je:
                    print(f"[ERROR] JSON解析失败: {str(je)}")
                    continue
        
        print(f"[ERROR] 未找到Steam ID为 {steam_id} 的配置")
        return jsonify({
            'success': False,
            'error': f'未找到Steam ID为 {steam_id} 的配置'
        }), 404
            
    except Exception as e:
        print(f"[ERROR] 获取Steam配置失败: {e}")
        import traceback
        print(f"[ERROR] 详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500


@webInventoryV1.route('/inventory/batch_update_yyyp_price', methods=['POST'])
def batch_update_yyyp_price():
    """批量更新悠悠有品价格"""
    try:
        # 获取请求数据
        data = request.get_json()
        
        if not data or 'weapon_list' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数 weapon_list'
            }), 400
        
        weapon_list = data['weapon_list']
        
        if not isinstance(weapon_list, list):
            return jsonify({
                'success': False,
                'error': 'weapon_list 必须是数组'
            }), 400
        
        # 统计信息
        success_count = 0
        failed_count = 0
        error_messages = []
        
        # 遍历列表，更新每个武器的价格
        for weapon in weapon_list:
            try:
                # 获取必要字段
                steam_asset_id = weapon.get('SteamAssetId')
                asset_add_time = weapon.get('AssetAddTime')
                show_mark_price = weapon.get('ShowMarkPrice')
                
                if not steam_asset_id:
                    failed_count += 1
                    error_messages.append(f"缺少 SteamAssetId")
                    continue
                
                # 查找库存记录
                inventory = SteamInventoryModel.find_by_assetid(steam_asset_id)
                
                if inventory:
                    # 更新已存在的记录
                    if asset_add_time:
                        inventory.order_time = asset_add_time
                    if show_mark_price:
                        # 提取价格数字部分（去掉 ￥ 符号）
                        if isinstance(show_mark_price, str) and show_mark_price.startswith('￥'):
                            price_value = show_mark_price.replace('￥', '').strip()
                        else:
                            price_value = str(show_mark_price)
                        inventory.yyyp_price = price_value
                    
                    if inventory.save():
                        success_count += 1
                    else:
                        failed_count += 1
                        error_messages.append(f"SteamAssetId {steam_asset_id} 更新失败")
                else:
                    # 记录不存在
                    failed_count += 1
                    error_messages.append(f"SteamAssetId {steam_asset_id} 在数据库中不存在")
                    
            except Exception as e:
                failed_count += 1
                error_messages.append(f"处理 SteamAssetId {weapon.get('SteamAssetId', 'Unknown')} 时出错: {str(e)}")
                print(f"批量更新时出错: {e}")
                import traceback
                print(traceback.format_exc())
        
        # 返回结果
        return jsonify({
            'success': True,
            'data': {
                'total': len(weapon_list),
                'success_count': success_count,
                'failed_count': failed_count,
                'error_messages': error_messages[:10]  # 只返回前10条错误信息
            }
        }), 200
        
    except Exception as e:
        print(f"批量更新悠悠有品价格失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'更新失败: {str(e)}'
        }), 500


@webInventoryV1.route('/inventory/batch_update_buff_price', methods=['POST'])
def batch_update_buff_price():
    """批量更新BUFF价格"""
    try:
        # 获取请求数据
        data = request.get_json()
        
        if not data or 'weapon_list' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数 weapon_list'
            }), 400
        
        weapon_list = data['weapon_list']
        
        if not isinstance(weapon_list, list):
            return jsonify({
                'success': False,
                'error': 'weapon_list 必须是数组'
            }), 400
        
        # 统计信息
        success_count = 0
        failed_count = 0
        error_messages = []
        
        # 遍历列表，更新每个武器的价格
        for weapon in weapon_list:
            try:
                # 获取必要字段
                assetid = weapon.get('assetid')
                instanceid = weapon.get('instanceid')
                steam_price = weapon.get('steam_price')
                buff_price = weapon.get('buff_price')
                
                if not assetid:
                    failed_count += 1
                    error_messages.append(f"缺少 assetid")
                    continue
                
                # 查找库存记录
                inventory = SteamInventoryModel.find_by_assetid(assetid)
                
                if inventory:
                    # 更新已存在的记录
                    if instanceid:
                        inventory.instanceid = instanceid
                    
                    if steam_price:
                        # 确保价格是字符串格式
                        inventory.steam_price = str(steam_price)
                    
                    if buff_price:
                        # 确保价格是字符串格式
                        inventory.buff_price = str(buff_price)
                    
                    if inventory.save():
                        success_count += 1
                    else:
                        failed_count += 1
                        error_messages.append(f"assetid {assetid} 更新失败")
                else:
                    # 记录不存在
                    failed_count += 1
                    error_messages.append(f"assetid {assetid} 在数据库中不存在")
                    
            except Exception as e:
                failed_count += 1
                error_messages.append(f"处理 assetid {weapon.get('assetid', 'Unknown')} 时出错: {str(e)}")
                print(f"批量更新时出错: {e}")
                import traceback
                print(traceback.format_exc())
        
        # 返回结果
        return jsonify({
            'success': True,
            'data': {
                'total': len(weapon_list),
                'success_count': success_count,
                'failed_count': failed_count,
                'error_messages': error_messages[:10]  # 只返回前10条错误信息
            }
        }), 200
        
    except Exception as e:
        print(f"批量更新BUFF价格失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'更新失败: {str(e)}'
        }), 500