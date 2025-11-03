from flask import jsonify, request, Blueprint
from src.execution_db import Date_base
from src.db_manager.yyyp.yyyp_buy import YyypBuyModel
from src.db_manager.index.buy import BuyModel

youpin898BuyV1 = Blueprint('youpin898BuyV1', __name__)

@youpin898BuyV1.route('/getWeaponNotEndStatusList/<data_user>', methods=['get'])
def getWeaponNotEndStatusList(data_user):
    try:
        records = YyypBuyModel.find_all(
            "status NOT IN ('已完成', '已取消') AND data_user = ?", 
            (data_user,)
        )
        data = [[record.ID] for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询未完成状态列表失败: {e}")
        return jsonify([]), 500

@youpin898BuyV1.route('/selectApexTime/<data_user>', methods=['get'])
@youpin898BuyV1.route('/selectApexTime/', methods=['get'])
@youpin898BuyV1.route('/selectApexTime', methods=['get'])
def selectApexTime(data_user=None):
    try:
        # 验证data_user参数
        if not data_user:
            return jsonify({'error': 'data_user参数不能为空'}), 400

        records = YyypBuyModel.find_all(
            "data_user = ? ORDER BY order_time DESC",
            (data_user,),
            limit=1
        )
        if records:
            data = str(records[0].order_time)
        else:
            data = 0
        return jsonify(data), 200
    except Exception as e:
        print(f"查询最新时间失败: {e}")
        return jsonify(0), 500

@youpin898BuyV1.route('/selectNotEndID/<data_user>', methods=['get'])
def selectNotEndID(data_user):
    try:
        records = YyypBuyModel.find_all(
            "status <> '已完成' AND status <> '已取消' AND data_user = ?", 
            (data_user,)
        )
        data = [[record.ID] for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询未完成ID列表失败: {e}")
        return jsonify([]), 500

@youpin898BuyV1.route('/getCount/<data_user>', methods=['get'])
def getCount(data_user):
    try:
        records = YyypBuyModel.find_all("data_user = ?", (data_user,))
        data = str(len(records))
        return data, 200
    except Exception as e:
        print(f"查询记录数量失败: {e}")
        return "0", 500

@youpin898BuyV1.route('/updateBuyData', methods=['post'])
def updateBuyData():
    try:
        data = request.get_json()
        weapon_ID = data['ID']
        weapon_status = data['weapon_status']
        
        # 更新yyyp_buy表
        yyyp_record = YyypBuyModel.find_by_id(ID=weapon_ID)
        if yyyp_record:
            yyyp_record.status = weapon_status
            yyyp_saved = yyyp_record.save()
        else:
            return "记录不存在", 404
        
        # 更新通用buy表
        buy_records = BuyModel.find_all("ID LIKE ? AND [from] = 'yyyp'", (f"{weapon_ID}%",))
        for buy_record in buy_records:
            buy_record.status = weapon_status
            buy_record.save()
        
        if yyyp_saved:
            return jsonify({'success': True, 'message': '更新成功'}), 200
        else:
            return jsonify({'success': False, 'error': '更新失败'}), 500
            
    except Exception as e:
        print(f"更新购买数据失败: {e}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500



@youpin898BuyV1.route('/insert_webside_buydata', methods=['post'])
def insert_webside_buydata():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
            
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        seller_name = data['seller_name']
        status = data['status']
        status_sub = data['status_sub']
        data_from = data['from']
        order_time = data['order_time']
        steamid = data['steam_id']
        data_user = data['data_user']
        try:
            buy_number = int(data['buy_number'])
        except (TypeError, ValueError):
            buy_number = None
        try:
            err_number = int(data['err_number'])
        except (TypeError, ValueError):
            err_number = None
        price_all = data['price_all']
        payment = data['payment']
        tradeType = data['tradeType']

        # 插入到yyyp_buy表
        print(f"插入悠悠有品购买记录到yyyp_buy表，ID: {ID}")
        yyyp_buy_record = YyypBuyModel()
        yyyp_buy_record.ID = ID
        yyyp_buy_record.weapon_name = weapon_name
        yyyp_buy_record.weapon_type = weapon_type
        yyyp_buy_record.item_name = item_name
        yyyp_buy_record.weapon_float = weapon_float
        yyyp_buy_record.float_range = float_range
        yyyp_buy_record.price = price
        yyyp_buy_record.seller_name = seller_name
        yyyp_buy_record.order_time = order_time
        yyyp_buy_record.status = status
        yyyp_buy_record.status_sub = status_sub
        yyyp_buy_record.steam_id = steamid
        yyyp_buy_record.buy_number = buy_number
        yyyp_buy_record.err_number = err_number
        yyyp_buy_record.price_all = price_all
        yyyp_buy_record.payment = payment
        yyyp_buy_record.trade_type = tradeType
        yyyp_buy_record.data_user = data_user
        setattr(yyyp_buy_record, 'from', 'yyyp')
        yyyp_saved = yyyp_buy_record.save()
        print(f"yyyp_buy表保存结果: {yyyp_saved}")
        
        # 如果buy_number为1，也插入到通用buy表
        buy_saved = True
        if buy_number == 1:
            print(f"插入购买记录到buy表，ID: {ID}")
            buy_record = BuyModel()
            buy_record.ID = ID
            buy_record.weapon_name = weapon_name
            buy_record.weapon_type = weapon_type
            buy_record.item_name = item_name
            buy_record.weapon_float = weapon_float
            buy_record.float_range = float_range
            buy_record.price = price
            buy_record.seller_name = seller_name
            buy_record.status = status
            buy_record.status_sub = status_sub
            buy_record.steam_id = steamid
            buy_record.order_time = order_time
            buy_record.payment = payment
            buy_record.trade_type = tradeType
            buy_record.data_user = data_user
            setattr(buy_record, 'from', 'yyyp')
            buy_saved = buy_record.save()
            print(f"buy表保存结果: {buy_saved}")

        if yyyp_saved and buy_saved:
            return jsonify({
                'success': True,
                'message': '悠悠有品购买数据插入成功',
                'data': {
                    'id': ID,
                    'weapon_name': weapon_name,
                    'item_name': item_name,
                    'price': price
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"悠悠有品购买数据插入错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

@youpin898BuyV1.route('/insert_main_buydata', methods=['post'])
def insert_main_buydata():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
            
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        seller_name = data['seller_name']
        status = data['status']
        status_sub = data['status_sub']
        data_from = data['from']
        order_time = data['order_time']
        steamid = data['steam_id']
        payment = data['payment']
        tradeType = data['tradeType']
        data_user = data['data_user']

        # 插入到通用buy表
        print(f"插入主购买记录到buy表，ID: {ID}")
        buy_record = BuyModel()
        buy_record.ID = ID
        buy_record.weapon_name = weapon_name
        buy_record.weapon_type = weapon_type
        buy_record.item_name = item_name
        buy_record.weapon_float = weapon_float
        buy_record.float_range = float_range
        buy_record.price = price
        buy_record.seller_name = seller_name
        buy_record.order_time = order_time
        buy_record.status = status
        buy_record.status_sub = status_sub
        buy_record.steam_id = steamid
        buy_record.payment = payment
        buy_record.trade_type = tradeType
        buy_record.data_user = data_user
        setattr(buy_record, 'from', 'yyyp')  # from是Python保留关键字，使用setattr设置
        
        buy_saved = buy_record.save()
        print(f"buy表保存结果: {buy_saved}")

        if buy_saved:
            return jsonify({
                'success': True,
                'message': '主购买数据插入成功',
                'data': {
                    'id': ID,
                    'weapon_name': weapon_name,
                    'item_name': item_name,
                    'price': price
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"主购买数据插入错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


