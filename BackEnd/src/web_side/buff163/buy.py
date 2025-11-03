from flask import jsonify, request, Blueprint
from src.execution_db import Date_base
from src.db_manager.buff.buff_buy import BuffBuyModel
from src.db_manager.index.buy import BuyModel

buff163BuyV1 = Blueprint('buff163BuyV1', __name__)

@buff163BuyV1.route('/selectNotEnd/<user_id>', methods=['get'])
def selectNotEnd(user_id):
    try:
        records = BuffBuyModel.find_all(
            "status NOT IN ('已完成', '已取消') AND data_user = ?", 
            (user_id,)
        )
        not_end_orders = [record.ID for record in records]
        return jsonify({"not_end_orders": not_end_orders}), 200
    except Exception as e:
        print(f"查询未完成订单失败: {e}")
        return jsonify({"not_end_orders": []}), 500


@buff163BuyV1.route('/ApexTimeUrl/<user_id>', methods=['get'])
def ApexTimeUrl(user_id):
    try:
        records = BuffBuyModel.find_all(
            "data_user = ? ORDER BY order_time DESC", 
            (user_id,), 
            limit=1
        )
        last_order_time = records[0].order_time if records else None
        return jsonify({"last_order_time": last_order_time}), 200
    except Exception as e:
        print(f"查询最新订单时间失败: {e}")
        return jsonify({"last_order_time": None}), 500

@buff163BuyV1.route('/getLatestData/<user_id>', methods=['GET'])
def getLatestData(user_id):
    """获取指定用户的最新一条购买记录（ID和订单时间）"""
    try:
        records = BuffBuyModel.find_all(
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
        print(f"获取最新购买数据失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({"ID": None, "order_time": None}), 500

@buff163BuyV1.route('/updateOrderStatus', methods=['post'])
def updateOrderStatus():
    try:
        data = request.get_json()
        item_id = data['item_id']
        status = data['state']
        status_sub = data.get('state_sub')
        
        # 更新buff_buy表
        buff_record = BuffBuyModel.find_by_id(ID=item_id)
        if buff_record:
            buff_record.status = status
            buff_record.status_sub = status_sub
            buff_record.save()
        
        # 更新通用buy表
        buy_record = BuyModel.find_by_id(ID=item_id)
        if buy_record:
            buy_record.status = status
            buy_record.status_sub = status_sub
            buy_record.save()
        
        return jsonify({'success': True, 'message': '更新成功'}), 200
    except Exception as e:
        print(f"更新订单状态失败: {e}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500  

@buff163BuyV1.route('/insert_db', methods=['post'])
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
        pay_method_text = data['pay_method_text']
        steam_price_cny = data.get('steam_price_cny')
        seller_id = data['seller_id']
        weapon_float = data['weapon_float']
        data_user = data['data_user']

        # 插入到buff_buy表
        print(f"插入BUFF购买记录到buff_buy表，ID: {item_id}")
        buff_buy_record = BuffBuyModel()
        buff_buy_record.ID = item_id
        buff_buy_record.weapon_name = weaponitem_name
        buff_buy_record.weapon_type = weapon_type
        buff_buy_record.item_name = item_name
        buff_buy_record.weapon_float = weapon_float
        buff_buy_record.float_range = float_range
        buff_buy_record.price = price
        buff_buy_record.seller_name = seller_id
        buff_buy_record.status = state
        buff_buy_record.order_time = created_at
        buff_buy_record.payment = pay_method_text
        buff_buy_record.data_user = data_user
        buff_buy_record.status_sub = state_sub
        setattr(buff_buy_record, 'from', 'buff')
        buff_saved = buff_buy_record.save()
        print(f"buff_buy表保存结果: {buff_saved}")

        # 插入到通用buy表
        print(f"插入购买记录到buy表，ID: {item_id}")
        buy_record = BuyModel()
        buy_record.ID = item_id
        buy_record.weapon_name = weaponitem_name
        buy_record.weapon_type = weapon_type
        buy_record.item_name = item_name
        buy_record.weapon_float = weapon_float
        buy_record.float_range = float_range
        buy_record.price = price
        buy_record.seller_name = seller_id
        buy_record.status = state
        buy_record.order_time = created_at
        buy_record.payment = pay_method_text
        buy_record.data_user = data_user
        buy_record.status_sub = state_sub
        setattr(buy_record, 'from', 'buff')
        buy_saved = buy_record.save()
        print(f"buy表保存结果: {buy_saved}")

        if buff_saved and buy_saved:
            return jsonify({
                'success': True,
                'message': 'BUFF购买数据插入成功',
                'data': {
                    'id': item_id,
                    'weapon_name': weaponitem_name,
                    'item_name': item_name,
                    'price': price
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"BUFF购买数据插入错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

@buff163BuyV1.route('/countData/<user_id>', methods=['get'])
def countData(user_id):
    try:
        records = BuffBuyModel.find_all("data_user = ?", (user_id,))
        count = len(records)
        print(count)
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询数据数量失败: {e}")
        return jsonify({"count": 0}), 500
    
