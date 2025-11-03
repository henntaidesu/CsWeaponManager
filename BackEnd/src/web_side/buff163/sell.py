from flask import jsonify, request, Blueprint
from src.execution_db import Date_base
from src.db_manager.buff.buff_sell import BuffSellModel
from src.db_manager.index.sell import SellModel

buff163SellV1 = Blueprint('buff163SellV1', __name__)

@buff163SellV1.route('/selectNotEnd/<user_id>', methods=['get'])
def selectNotEnd(user_id):
    try:
        records = BuffSellModel.find_all(
            "status NOT IN ('已完成', '已取消') AND data_user = ?", 
            (user_id,)
        )
        not_end_orders = [record.ID for record in records]
        return jsonify({"not_end_orders": not_end_orders}), 200
    except Exception as e:
        print(f"查询未完成订单失败: {e}")
        return jsonify({"not_end_orders": []}), 500


@buff163SellV1.route('/ApexTimeUrl/<user_id>', methods=['get'])
def ApexTimeUrl(user_id):
    try:
        records = BuffSellModel.find_all(
            "data_user = ? ORDER BY order_time DESC", 
            (user_id,), 
            limit=1
        )
        last_order_time = records[0].order_time if records else None
        return jsonify({"last_order_time": last_order_time}), 200
    except Exception as e:
        print(f"查询最新订单时间失败: {e}")
        return jsonify({"last_order_time": None}), 500

@buff163SellV1.route('/getLatestData/<user_id>', methods=['GET'])
def getLatestData(user_id):
    """获取指定用户的最新一条销售记录（ID和订单时间）"""
    try:
        records = BuffSellModel.find_all(
            "data_user = ? ORDER BY order_time DESC", 
            (user_id,), 
            limit=1
        )
        
        if records and len(records) > 0:
            latest_record = records[0]
            return jsonify({
                "ID": latest_record.ID,
                "order_time": latest_record.order_time
            }), 200
        else:
            return jsonify({"ID": None, "order_time": None}), 200
    except Exception as e:
        print(f"获取最新销售数据失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({"ID": None, "order_time": None}), 500

@buff163SellV1.route('/updateOrderStatus', methods=['post'])
def updateOrderStatus():
    try:
        data = request.get_json()
        item_id = data['item_id']
        status = data['state']
        status_sub = data.get('state_sub')
        
        # 更新buff_sell表
        buff_record = BuffSellModel.find_by_id(ID=item_id)
        if buff_record:
            buff_record.status = status
            buff_record.status_sub = status_sub
            buff_record.save()
        
        # 更新通用sell表
        sell_record = SellModel.find_by_id(ID=item_id)
        if sell_record:
            sell_record.status = status
            sell_record.status_sub = status_sub
            sell_record.save()
        
        return jsonify({'success': True, 'message': '更新成功'}), 200
    except Exception as e:
        print(f"更新订单状态失败: {e}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500  

@buff163SellV1.route('/insert_db', methods=['post'])
def insert_db():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        item_id = data['item_id']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weaponitem_name = data['weaponitem_name']
        float_range = data['float_range']
        price = data['price']
        state = data['state']
        state_sub = data['state_sub']
        created_at = data['created_at']
        price_original = data.get('price_original')
        seller_id = data['seller_id']
        weapon_float = data['weapon_float']
        data_user = data['data_user']

        # 插入到buff_sell表
        print(f"插入BUFF销售记录到buff_sell表，ID: {item_id}")
        buff_sell_record = BuffSellModel()
        buff_sell_record.ID = item_id
        buff_sell_record.weapon_name = weaponitem_name
        buff_sell_record.weapon_type = weapon_type
        buff_sell_record.item_name = item_name
        buff_sell_record.weapon_float = weapon_float
        buff_sell_record.float_range = float_range
        buff_sell_record.price = price
        buff_sell_record.price_original = price_original
        buff_sell_record.buyer_name = seller_id
        buff_sell_record.status = state
        buff_sell_record.order_time = created_at
        buff_sell_record.data_user = data_user
        buff_sell_record.status_sub = state_sub
        setattr(buff_sell_record, 'from', 'buff')
        buff_saved = buff_sell_record.save()
        print(f"buff_sell表保存结果: {buff_saved}")

        # 插入到通用sell表
        print(f"插入销售记录到sell表，ID: {item_id}")
        sell_record = SellModel()
        sell_record.ID = item_id
        sell_record.weapon_name = weaponitem_name
        sell_record.weapon_type = weapon_type
        sell_record.item_name = item_name
        sell_record.weapon_float = weapon_float
        sell_record.float_range = float_range
        sell_record.price = price
        sell_record.price_original = price_original
        sell_record.buyer_name = seller_id
        sell_record.status = state
        sell_record.order_time = created_at
        sell_record.data_user = data_user
        sell_record.status_sub = state_sub
        setattr(sell_record, 'from', 'buff')
        sell_saved = sell_record.save()
        print(f"sell表保存结果: {sell_saved}")

        if buff_saved and sell_saved:
            return jsonify({
                'success': True,
                'message': 'BUFF销售数据插入成功',
                'data': {
                    'id': item_id,
                    'weapon_name': weaponitem_name,
                    'item_name': item_name,
                    'price': price,
                    'price_original': price_original
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"BUFF销售数据插入错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

@buff163SellV1.route('/countData/<user_id>', methods=['get'])
def countData(user_id):
    try:
        records = BuffSellModel.find_all("data_user = ?", (user_id,))
        count = len(records)
        print(count)
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询数据数量失败: {e}")
        return jsonify({"count": 0}), 500
    
