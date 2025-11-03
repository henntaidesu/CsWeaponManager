from flask import jsonify, request, Blueprint
from src.execution_db import Date_base
from src.db_manager.steam.steam_inventory_history import SteamInventoryHistoryModel

steamInventoryHistoryV1 = Blueprint('steamInventoryHistoryV1', __name__)


@steamInventoryHistoryV1.route('/getLatestData/<steam_id>', methods=['GET'])
def getLatestData(steam_id):
    """获取指定用户的最新一条库存历史记录"""
    try:
        sql = """
        SELECT trade_id, trade_time_timestamp
        FROM steam_inventory_history 
        WHERE steamId = ?
        ORDER BY created_at DESC 
        LIMIT 1
        """
        result = Date_base().select(sql, (steam_id,))
        
        if result and len(result) == 2:
            flag, data = result
            if flag and len(data) > 0:
                return jsonify({
                    "trade_id": data[0][0],
                    "trade_time": data[0][1]
                }), 200
        
        return jsonify({"trade_id": None, "trade_time": None}), 200
        
    except Exception as e:
        print(f"获取最新库存历史记录失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({"trade_id": None, "trade_time": None}), 500


@steamInventoryHistoryV1.route('/insert', methods=['POST'])
def insert():
    """插入库存历史记录"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        # 插入主记录
        sql = """
        INSERT OR REPLACE INTO steam_inventory_history (
            trade_id, trade_time, trade_time_timestamp, trade_type,
            trade_partner, items_gave_count, items_received_count, steamId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        params = (
            data.get('trade_id'),
            data.get('trade_time'),
            data.get('trade_time_timestamp'),
            data.get('trade_type'),
            data.get('trade_partner'),
            data.get('items_gave_count', 0),
            data.get('items_received_count', 0),
            data.get('steamId')
        )
        
        insert_result = Date_base().insert(sql, params)
        
        if insert_result and insert_result[0]:
            # 插入给出的物品
            for item in data.get('items_gave', []):
                insert_item_sql = """
                INSERT INTO steam_inventory_history_items (
                    trade_id, item_type, item_name, market_hash_name,
                    weapon_type, weapon_name, skin_name, exterior,
                    item_icon, item_color
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                item_params = (
                    data.get('trade_id'),
                    'gave',
                    item.get('item_name'),
                    item.get('market_hash_name'),
                    item.get('weapon_type'),
                    item.get('weapon_name'),
                    item.get('skin_name'),
                    item.get('exterior'),
                    item.get('item_icon'),
                    item.get('item_color')
                )
                Date_base().insert(insert_item_sql, item_params)
            
            # 插入收到的物品
            for item in data.get('items_received', []):
                insert_item_sql = """
                INSERT INTO steam_inventory_history_items (
                    trade_id, item_type, item_name, market_hash_name,
                    weapon_type, weapon_name, skin_name, exterior,
                    item_icon, item_color
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                item_params = (
                    data.get('trade_id'),
                    'received',
                    item.get('item_name'),
                    item.get('market_hash_name'),
                    item.get('weapon_type'),
                    item.get('weapon_name'),
                    item.get('skin_name'),
                    item.get('exterior'),
                    item.get('item_icon'),
                    item.get('item_color')
                )
                Date_base().insert(insert_item_sql, item_params)
            
            return jsonify({
                'success': True,
                'message': '库存历史记录插入成功',
                'data': {'trade_id': data.get('trade_id')}
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"插入库存历史记录失败: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@steamInventoryHistoryV1.route('/countData/<steam_id>', methods=['GET'])
def countData(steam_id):
    """获取指定用户的库存历史记录数量"""
    try:
        sql = "SELECT COUNT(*) FROM steam_inventory_history WHERE steamId = ?"
        result = Date_base().select(sql, (steam_id,))
        
        if result and len(result) == 2:
            flag, data = result
            if flag and len(data) > 0:
                return jsonify({"count": data[0][0]}), 200
        
        return jsonify({"count": 0}), 200
        
    except Exception as e:
        print(f"查询库存历史记录数量失败: {e}")
        return jsonify({"count": 0}), 500


@steamInventoryHistoryV1.route('/getData/<steam_id>/<int:offset>/<int:limit>', methods=['GET'])
def getData(steam_id, offset, limit):
    """获取指定用户的库存历史记录（分页）"""
    try:
        sql = """
        SELECT trade_id, trade_time, trade_type, trade_partner,
               items_gave_count, items_received_count
        FROM steam_inventory_history
        WHERE steamId = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """
        result = Date_base().select(sql, (steam_id, limit, offset))
        
        if result and len(result) == 2:
            flag, data = result
            if flag:
                return jsonify(data), 200
        
        return jsonify([]), 200
        
    except Exception as e:
        print(f"查询库存历史记录失败: {e}")
        return jsonify([]), 500


@steamInventoryHistoryV1.route('/getTradeDetails/<trade_id>', methods=['GET'])
def getTradeDetails(trade_id):
    """获取交易详情，包括所有物品"""
    try:
        # 获取交易基本信息
        trade_sql = """
        SELECT trade_id, trade_time, trade_time_timestamp, trade_type,
               trade_partner, items_gave_count, items_received_count, steamId
        FROM steam_inventory_history
        WHERE trade_id = ?
        """
        trade_result = Date_base().select(trade_sql, (trade_id,))
        
        if not trade_result or not trade_result[0] or len(trade_result[1]) == 0:
            return jsonify({'success': False, 'error': '交易不存在'}), 404
        
        trade_data = trade_result[1][0]
        
        # 获取物品信息
        items_sql = """
        SELECT item_type, item_name, market_hash_name,
               weapon_type, weapon_name, skin_name, exterior,
               item_icon, item_color
        FROM steam_inventory_history_items
        WHERE trade_id = ?
        """
        items_result = Date_base().select(items_sql, (trade_id,))
        
        items_gave = []
        items_received = []
        
        if items_result and items_result[0]:
            for item_row in items_result[1]:
                item = {
                    'item_type': item_row[0],
                    'item_name': item_row[1],
                    'market_hash_name': item_row[2],
                    'weapon_type': item_row[3],
                    'weapon_name': item_row[4],
                    'skin_name': item_row[5],
                    'exterior': item_row[6],
                    'item_icon': item_row[7],
                    'item_color': item_row[8]
                }
                
                if item['item_type'] == 'gave':
                    items_gave.append(item)
                else:
                    items_received.append(item)
        
        result = {
            'trade_id': trade_data[0],
            'trade_time': trade_data[1],
            'trade_time_timestamp': trade_data[2],
            'trade_type': trade_data[3],
            'trade_partner': trade_data[4],
            'items_gave_count': trade_data[5],
            'items_received_count': trade_data[6],
            'steamId': trade_data[7],
            'items_gave': items_gave,
            'items_received': items_received
        }
        
        return jsonify({'success': True, 'data': result}), 200
        
    except Exception as e:
        print(f"查询交易详情失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


