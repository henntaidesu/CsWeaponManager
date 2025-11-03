from flask import jsonify, request, Blueprint
from src.db_manager.steam.steam_inventory_history import SteamInventoryHistoryModel
from src.db_manager.steam.steam_inventory_history_index import SteamInventoryHistoryIndexModel
from datetime import datetime
import json
import traceback

steamInventoryHistoryV1 = Blueprint('steamInventoryHistoryV1', __name__)


@steamInventoryHistoryV1.route('/selectMaxTime/<steam_ID>', methods=['GET'])
def selectMaxTime(steam_ID):
    """查询指定用户的最新一条历史记录"""
    try:
        if not steam_ID:
            return jsonify({'success': False, 'error': '缺少steam_ID参数'}), 400
        
        # 使用模型查询最新的一条记录
        records = SteamInventoryHistoryIndexModel.find_all(
            "data_user = ? ORDER BY order_time DESC",
            (steam_ID,),
            limit=1
        )
        
        if records and len(records) > 0:
            record = records[0]
            return jsonify({
                'success': True,
                'data': {
                    'ID': record.ID,
                    'order_time': record.order_time,
                    'trade_type': record.trade_type,
                    'data_user': record.data_user
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'data': None,
                'message': '未找到相关记录'
            }), 200
            
    except Exception as e:
        print(f"[错误] 查询最新记录失败")
        print(f"  Steam ID: {steam_ID}")
        print(f"  异常类型: {type(e).__name__}")
        print(f"  异常信息: {str(e)}")
        print(f"  堆栈跟踪:\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'查询失败: {str(e)}'}), 500


@steamInventoryHistoryV1.route('/selectMinTime/<steam_ID>', methods=['GET'])
def selectMinTime(steam_ID):
    """查询指定用户的最早一条历史记录"""
    try:
        if not steam_ID:
            return jsonify({'success': False, 'error': '缺少steam_ID参数'}), 400
        
        # 使用模型查询最早的一条记录
        records = SteamInventoryHistoryIndexModel.find_all(
            "data_user = ? ORDER BY order_time ASC",
            (steam_ID,),
            limit=1
        )
        
        if records and len(records) > 0:
            record = records[0]
            return jsonify({
                'success': True,
                'data': {
                    'ID': record.ID,
                    'order_time': record.order_time,
                    'trade_type': record.trade_type,
                    'data_user': record.data_user
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'data': None,
                'message': '未找到相关记录'
            }), 200
            
    except Exception as e:
        print(f"[错误] 查询最早记录失败")
        print(f"  Steam ID: {steam_ID}")
        print(f"  异常类型: {type(e).__name__}")
        print(f"  异常信息: {str(e)}")
        print(f"  堆栈跟踪:\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'查询失败: {str(e)}'}), 500


@steamInventoryHistoryV1.route('/insert_inventory_history', methods=['POST'])
def insert_inventory_history():
    """插入Steam库存历史记录 - 使用索引表防止重复"""
    try:
        data = request.get_json()
        if not data:
            print("错误：无效的JSON数据")
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        item_ID = data.get('ID')
        trade_title = data.get('trade_title')
        items = data.get('items')
        order_time = data.get('order_time')
        trade_type = data.get('trade_type')
        data_user = data.get('data_user')
        
        if not item_ID:
            return jsonify({'success': False, 'error': '缺少ID参数'}), 400
        
        if items is None or not isinstance(items, list):
            return jsonify({'success': False, 'error': '无效的items数据'}), 400
        
        # items可以为空数组（空交易记录）
        if len(items) == 0:
            print(f"[信息] 空交易记录，ID: {item_ID}，无物品")
        
        # 1. 首先检查索引表中是否已存在该ID
        existing_index = SteamInventoryHistoryIndexModel.find_by_id(ID=item_ID)
        if existing_index:
            print(f"[跳过] ID {item_ID} 已存在于索引表中，跳过重复入库")
            return jsonify({
                'success': True,
                'message': '记录已存在，跳过重复入库',
                'data': {
                    'already_exists': True,
                    'ID': item_ID,
                    'skip_count': len(items)
                }
            }), 200
        
        # 2. ID不存在，开始插入数据
        success_count = 0
        failed_count = 0
        
        # 3. 先插入所有物品详情到 steam_inventoryhistory 表
        for i in items:
            try:
                # 创建库存历史记录模型实例
                inventory_record = SteamInventoryHistoryModel()
                inventory_record.instanceid = i.get('instanceid')
                inventory_record.classid = i.get('classid')
                inventory_record.ID = item_ID
                inventory_record.order_time = order_time
                inventory_record.trade_title = trade_title
                inventory_record.appid = i.get('appid')
                inventory_record.item_name = i.get('item_name')
                inventory_record.weapon_name = i.get('weapon_name')
                inventory_record.weapon_type = i.get('weapon_type')
                inventory_record.float_range = i.get('float_range')
                inventory_record.trade_type = trade_type
                inventory_record.data_user = data_user
                
                # 保存记录
                saved = inventory_record.save()
                
                if saved:
                    success_count += 1
                else:
                    failed_count += 1
                    print(f"[失败] 插入库存历史记录失败")
                    print(f"  记录数据: {json.dumps(inventory_record.to_dict(), ensure_ascii=False, indent=2, default=str)}")
                    
            except Exception as item_error:
                failed_count += 1
                print(f"[异常] 处理单条记录时发生异常")
                print(f"  异常类型: {type(item_error).__name__}")
                print(f"  异常信息: {str(item_error)}")
                print(f"  Item数据: {json.dumps(i, ensure_ascii=False, indent=2)}")
                print(f"  堆栈跟踪:\n{traceback.format_exc()}")
        
        # 4. 如果有物品成功插入或items为空，则在索引表中创建记录
        if success_count > 0 or len(items) == 0:
            try:
                index_record = SteamInventoryHistoryIndexModel()
                index_record.ID = item_ID
                index_record.order_time = order_time
                index_record.trade_type = trade_type
                index_record.data_user = data_user
                
                index_saved = index_record.save()
                
                if index_saved:
                    if len(items) == 0:
                        print(f"[成功] 空交易记录索引创建成功: ID={item_ID}")
                    else:
                        print(f"[成功] 索引记录创建成功: ID={item_ID}")
                else:
                    print(f"[警告] 索引记录创建失败: ID={item_ID}")
                    
            except Exception as index_error:
                print(f"[异常] 创建索引记录时发生异常")
                print(f"  异常类型: {type(index_error).__name__}")
                print(f"  异常信息: {str(index_error)}")
                print(f"  堆栈跟踪:\n{traceback.format_exc()}")
        
        # 5. 返回结果
        if success_count > 0 or len(items) == 0:
            message = '空交易记录已保存' if len(items) == 0 else f'成功插入{success_count}条记录'
            return jsonify({
                'success': True,
                'message': message,
                'data': {
                    'ID': item_ID,
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'total_count': len(items),
                    'is_empty': len(items) == 0
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'所有记录插入失败，共{failed_count}条',
                'data': {
                    'ID': item_ID,
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'total_count': len(items)
                }
            }), 500
            
    except Exception as e:
        print(f"[严重错误] 服务器发生未捕获异常")
        print(f"  异常类型: {type(e).__name__}")
        print(f"  异常信息: {str(e)}")
        print(f"  堆栈跟踪:\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500