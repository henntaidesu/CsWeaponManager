from flask import jsonify, request, Blueprint
from src.db_manager.steam.steam_inventory import SteamInventoryModel

steamInventoryV1 = Blueprint('steamInventoryV1', __name__)


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


def get_price_from_buy_table(item_name, weapon_float=None):
    """
    从buy表查询价格
    """
    from src.db_manager.database import DatabaseManager
    db = DatabaseManager()
    
    if weapon_float:
        # 有磨损值，查询精确匹配
        price_sql = "SELECT price FROM buy WHERE item_name = ? AND weapon_float = ? LIMIT 1"
        price_result = db.execute_query(price_sql, (item_name, weapon_float))
        if price_result and len(price_result) > 0:
            return price_result[0][0]
    else:
        # 没有磨损值，查询平均价格
        avg_price_sql = "SELECT AVG(CAST(price AS REAL)) FROM buy WHERE item_name = ?"
        avg_result = db.execute_query(avg_price_sql, (item_name,))
        if avg_result and len(avg_result) > 0 and avg_result[0][0] is not None:
            return round(avg_result[0][0], 2)
    
    return None

@steamInventoryV1.route('/inventory', methods=['POST'])
def insert_inventory():
    """插入Steam库存数据"""
    try:
        data = request.get_json()
        if not data:
            print("错误：无效的JSON数据")
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        # 创建库存记录
        inventory_record = SteamInventoryModel()
        
        # 基本信息
        inventory_record.assetid = data.get('assetid')
        inventory_record.instanceid = data.get('instanceid')
        inventory_record.classid = data.get('classid')
        inventory_record.data_user = data.get('steamId')
        
        # 武器信息 - 从tags中的parsed_name获取
        tags = data.get('tags', {})
        parsed_name = tags.get('parsed_name', {})
        
        inventory_record.weapon_type = parsed_name.get('weapon_type')
        inventory_record.weapon_name = parsed_name.get('weapon_name')
        inventory_record.item_name = parsed_name.get('item_name') or data.get('name')
        
        # 外观信息 - 从tags中获取
        exterior = tags.get('Exterior', {})
        inventory_record.float_range = exterior.get('localized_tag_name')
        
        # 磨损值 - 优先使用前端传来的weapon_float（用于库存存储组件的数量），否则从asset_properties中获取
        weapon_float = data.get('weapon_float')
        if weapon_float is None:
            # 从asset_properties中获取磨损值
            asset_properties = data.get('asset_properties', [])
            for prop in asset_properties:
                if prop.get('propertyid') == 2:  # propertyid 2 是磨损率
                    weapon_float = prop.get('float_value')
                    break
        inventory_record.weapon_float = weapon_float
        
        # 交易相关
        # remark 存储交易保护信息，如果没有则为NULL
        trade_lock_info = data.get('trade_lock_info')
        inventory_record.remark = trade_lock_info if trade_lock_info else None
        
        # buy_price 字段 - 自动填充价格
        buy_price = data.get('buy_price')
        
        # 如果没有提供价格，尝试自动填充
        if buy_price is None or buy_price == '' or buy_price == 'None':
            # 先尝试特殊物品自动价格
            auto_price = get_auto_price(inventory_record.item_name)
            
            if auto_price is not None:
                buy_price = auto_price
            else:
                # 从buy表查询价格
                buy_price_from_db = get_price_from_buy_table(inventory_record.item_name, weapon_float)
                if buy_price_from_db is not None:
                    buy_price = buy_price_from_db
        
        inventory_record.buy_price = buy_price
        
        # 设置if_inventory为'1'（表示在库存中）
        inventory_record.if_inventory = '1'
        
        # 保存到数据库
        saved = inventory_record.save()
        
        if saved:
            return jsonify({
                'success': True,
                'message': '库存数据插入成功',
                'data': {
                    'assetid': data.get('assetid'),
                    'weapon_name': inventory_record.weapon_name,
                    'item_name': inventory_record.item_name,
                    'weapon_float': weapon_float
                }
            }), 200
        else:
            print("数据插入失败")
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"服务器错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@steamInventoryV1.route('/inventory/<data_user>', methods=['GET'])
def get_inventory_by_user(data_user):
    """根据Steam ID获取库存列表"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        records = SteamInventoryModel.find_by_user(data_user, limit, offset)
        
        # 转换为字典列表
        inventory_list = []
        for record in records:
            inventory_list.append({
                'assetid': record.assetid,
                'instanceid': record.instanceid,
                'classid': record.classid,
                'weapon_name': record.weapon_name,
                'item_name': record.item_name,
                'weapon_type': record.weapon_type,
                'weapon_float': record.weapon_float,
                'float_range': record.float_range,
                'remark': record.remark
            })
        
        return jsonify({
            'success': True,
            'data': inventory_list,
            'count': len(inventory_list)
        }), 200
        
    except Exception as e:
        print(f"查询库存失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'查询失败: {str(e)}'
        }), 500


@steamInventoryV1.route('/inventory/count/<data_user>', methods=['GET'])
def count_inventory(data_user):
    """统计用户库存数量"""
    try:
        records = SteamInventoryModel.find_by_user(data_user)
        count = len(records)
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': data_user,
                'count': count
            }
        }), 200
        
    except Exception as e:
        print(f"统计库存失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'统计失败: {str(e)}'
        }), 500


@steamInventoryV1.route('/inventory/user/<data_user>', methods=['DELETE'])
def delete_user_inventory(data_user):
    """删除指定用户的所有库存记录"""
    try:
        # 先统计有多少条记录
        count_before = SteamInventoryModel.count("data_user = ?", (data_user,))
        
        if count_before == 0:
            return jsonify({
                'success': True,
                'message': '没有需要删除的记录',
                'deleted_count': 0
            }), 200
        
        # 使用SQL直接删除
        from src.db_manager.database import DatabaseManager
        db = DatabaseManager()
        sql = f"DELETE FROM {SteamInventoryModel.get_table_name()} WHERE data_user = ?"
        deleted_count = db.execute_update(sql, (data_user,))
        
        return jsonify({
            'success': True,
            'message': f'成功删除 {deleted_count} 条库存记录',
            'deleted_count': deleted_count
        }), 200
        
    except Exception as e:
        print(f"删除库存失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'删除失败: {str(e)}'
        }), 500


@steamInventoryV1.route('/inventory/batch', methods=['POST'])
def insert_inventory_batch():
    """批量插入/更新Steam库存数据"""
    try:
        data = request.get_json()
        if not data:
            print("错误：无效的JSON数据")
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        steam_id = data.get('steamId')
        items = data.get('items', [])
        
        if not steam_id or not items:
            return jsonify({'success': False, 'error': 'steamId和items不能为空'}), 400
        
        print(f"开始批量更新库存 - 用户: {steam_id}, 数据量: {len(items)}")
        
        # ==================== 新增：第一步 - 标记不在新列表中的旧库存为已移出 ====================
        # 获取新列表中所有的assetid
        new_assetids = [item.get('assetid') for item in items if item.get('assetid')]
        removed_count = 0
        
        if new_assetids:
            # 查询数据库中该用户的所有if_inventory=1的记录
            from src.db_manager.database import DatabaseManager
            db = DatabaseManager()
            
            # 构建占位符字符串
            placeholders = ','.join(['?' for _ in new_assetids])
            
            # 将数据库中存在但不在新列表中的记录标记为if_inventory=0
            mark_removed_sql = f"""
            UPDATE {SteamInventoryModel.get_table_name()} 
            SET if_inventory = '0'
            WHERE data_user = ? 
            AND if_inventory = '1'
            AND assetid NOT IN ({placeholders})
            """
            
            # 参数列表：steam_id + 所有新的assetids
            mark_params = [steam_id] + new_assetids
            removed_count = db.execute_update(mark_removed_sql, tuple(mark_params))
            
            if removed_count > 0:
                print(f"标记 {removed_count} 件物品为已移出库存（if_inventory=0）")
        
        # ==================== 第二步 - 插入或更新新列表中的物品 ====================
        # 批量插入/更新数据
        success_count = 0
        update_count = 0
        insert_count = 0
        fail_count = 0
        failed_items = []
        price_filled_count = 0  # 自动填充价格成功的数量
        price_not_filled_count = 0  # 未能填充价格的数量
        
        for item_data in items:
            try:
                # 创建库存记录
                inventory_record = SteamInventoryModel()
                
                # 基本信息
                inventory_record.assetid = item_data.get('assetid')
                inventory_record.instanceid = item_data.get('instanceid')
                inventory_record.classid = item_data.get('classid')
                inventory_record.data_user = item_data.get('steamId')
                
                # 武器信息 - 从tags中的parsed_name获取
                tags = item_data.get('tags', {})
                parsed_name = tags.get('parsed_name', {})
                
                inventory_record.weapon_type = parsed_name.get('weapon_type')
                inventory_record.weapon_name = parsed_name.get('weapon_name')
                inventory_record.item_name = parsed_name.get('item_name') or item_data.get('name')
                
                # 外观信息 - 从tags中获取
                exterior = tags.get('Exterior', {})
                inventory_record.float_range = exterior.get('localized_tag_name')
                
                # 磨损值 - 优先使用前端传来的weapon_float（用于库存存储组件的数量），否则从asset_properties中获取
                weapon_float = item_data.get('weapon_float')
                if weapon_float is None:
                    # 从asset_properties中获取磨损值
                    asset_properties = item_data.get('asset_properties', [])
                    for prop in asset_properties:
                        if prop.get('propertyid') == 2:  # propertyid 2 是磨损率
                            weapon_float = prop.get('float_value')
                            break
                inventory_record.weapon_float = weapon_float
                
                # 交易相关
                # remark 存储交易保护信息，如果没有则为NULL
                trade_lock_info = item_data.get('trade_lock_info')
                inventory_record.remark = trade_lock_info if trade_lock_info else None
                
                # 检查数据库中是否已存在该assetid的记录
                assetid = item_data.get('assetid')
                existing_record = SteamInventoryModel.find_by_assetid(assetid)
                
                # buy_price 字段 - 自动填充价格
                buy_price = item_data.get('buy_price')
                price_auto_filled = False
                
                # 如果没有提供价格，尝试自动填充
                if buy_price is None or buy_price == '' or buy_price == 'None':
                    # 如果已存在记录，优先使用原有价格
                    if existing_record and existing_record.buy_price:
                        buy_price = existing_record.buy_price
                    else:
                        # 先尝试特殊物品自动价格
                        auto_price = get_auto_price(inventory_record.item_name)
                        
                        if auto_price is not None:
                            buy_price = auto_price
                            price_auto_filled = True
                        else:
                            # 从buy表查询价格
                            buy_price_from_db = get_price_from_buy_table(inventory_record.item_name, weapon_float)
                            if buy_price_from_db is not None:
                                buy_price = buy_price_from_db
                                price_auto_filled = True
                        
                        # 统计填充结果
                        if price_auto_filled:
                            price_filled_count += 1
                        else:
                            price_not_filled_count += 1
                
                inventory_record.buy_price = buy_price
                
                # 设置if_inventory为'1'（表示在库存中）
                inventory_record.if_inventory = '1'
                
                # 判断是更新还是插入
                if existing_record:
                    # 更新现有记录（使用主键assetid）
                    from src.db_manager.database import DatabaseManager
                    db = DatabaseManager()
                    
                    update_sql = f"""
                    UPDATE {SteamInventoryModel.get_table_name()} 
                    SET instanceid = ?, classid = ?, item_name = ?, weapon_name = ?, 
                        float_range = ?, weapon_type = ?, weapon_float = ?, remark = ?, 
                        data_user = ?, buy_price = ?, if_inventory = '1'
                    WHERE assetid = ?
                    """
                    
                    affected = db.execute_update(update_sql, (
                        inventory_record.instanceid,
                        inventory_record.classid,
                        inventory_record.item_name,
                        inventory_record.weapon_name,
                        inventory_record.float_range,
                        inventory_record.weapon_type,
                        inventory_record.weapon_float,
                        inventory_record.remark,
                        steam_id,
                        inventory_record.buy_price,
                        assetid
                    ))
                    
                    if affected > 0:
                        success_count += 1
                        update_count += 1
                    else:
                        fail_count += 1
                        failed_items.append({
                            'assetid': assetid,
                            'reason': '更新失败'
                        })
                else:
                    # 插入新记录
                    saved = inventory_record.save()
                    
                    if saved:
                        success_count += 1
                        insert_count += 1
                        
                        # 特殊处理：对于 classID = 3604678661 的库存存储组件，插入后立即更新 item_name 和 weapon_float
                        if item_data.get('classid') == '3604678661':
                            from src.db_manager.database import DatabaseManager
                            db = DatabaseManager()
                            
                            # 更新 item_name 和 weapon_float
                            update_storage_sql = f"""
                            UPDATE {SteamInventoryModel.get_table_name()} 
                            SET item_name = ?, weapon_float = ?
                            WHERE assetid = ?
                            """
                            
                            db.execute_update(update_storage_sql, (
                                inventory_record.item_name,
                                inventory_record.weapon_float,
                                assetid
                            ))
                            
                            print(f"库存存储组件特殊更新 - assetid: {assetid}, item_name: {inventory_record.item_name}, weapon_float: {inventory_record.weapon_float}")
                    else:
                        fail_count += 1
                        failed_items.append({
                            'assetid': assetid,
                            'reason': '插入失败'
                        })
                    
            except Exception as e:
                fail_count += 1
                failed_items.append({
                    'assetid': item_data.get('assetid'),
                    'reason': str(e)
                })
                print(f"插入单条数据时出错: {str(e)}")
        
        # 打印统计信息
        print(f"价格自动填充统计 - 成功: {price_filled_count}, 失败: {price_not_filled_count}")
        print(f"库存更新统计 - 更新: {update_count}, 新增: {insert_count}, 移出: {removed_count}, 失败: {fail_count}")
        
        return jsonify({
            'success': True,
            'message': f'批量更新完成',
            'data': {
                'success_count': success_count,
                'update_count': update_count,
                'insert_count': insert_count,
                'removed_count': removed_count,  # 新增：移出库存的数量
                'fail_count': fail_count,
                'total': len(items),
                'price_filled_count': price_filled_count,
                'price_not_filled_count': price_not_filled_count,
                'failed_items': failed_items if failed_items else None
            }
        }), 200
            
    except Exception as e:
        print(f"批量插入服务器错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@steamInventoryV1.route('/inventory/buy_price/<steam_id>/<assetid>', methods=['PUT'])
def update_buy_price(steam_id, assetid):
    """更新库存物品的购入价格"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        buy_price = data.get('buy_price')
        
        # 使用直接SQL更新
        from src.db_manager.database import DatabaseManager
        db = DatabaseManager()
        conn = db.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE steam_inventory SET buy_price = ? WHERE data_user = ? AND assetid = ?',
            (buy_price, steam_id, assetid)
        )
        
        conn.commit()
        affected = cursor.rowcount
        
        if affected > 0:
            return jsonify({
                'success': True,
                'message': '更新成功',
                'affected': affected
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '未找到匹配的记录'
            }), 404
            
    except Exception as e:
        print(f"更新buy_price时出错: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500
