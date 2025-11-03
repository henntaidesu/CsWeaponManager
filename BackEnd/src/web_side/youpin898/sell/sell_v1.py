from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.db_manager.yyyp.yyyp_sell import YyypSellModel
from src.db_manager.index.sell import SellModel
import requests

youpin898SellV1 = Blueprint('youpin898SellV1/', __name__)

@youpin898SellV1.route('/getWeaponNotEndStatusList/<data_user>', methods=['get'])
def getWeaponNotEndStatusList(data_user):
    try:
        records = YyypSellModel.find_all(
            "status NOT IN ('已完成', '已取消') AND data_user = ?", 
            (data_user,)
        )
        data = [[record.ID] for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询未完成状态列表失败: {e}")
        return jsonify([]), 500

@youpin898SellV1.route('/updateSellData', methods=['post'])
def updateSellData():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
            
        weapon_ID = data.get('ID')
        weapon_status = data.get('weapon_status')
        weapon_status_sub = data.get('weapon_status_sub')
        
        if not weapon_ID or not weapon_status:
            return jsonify({'success': False, 'error': '缺少必需参数ID或weapon_status'}), 400
        
        # 更新yyyp_sell表
        yyyp_record = YyypSellModel.find_by_id(ID=weapon_ID)
        if yyyp_record:
            yyyp_record.status = weapon_status
            if weapon_status_sub is not None:
                yyyp_record.status_sub = weapon_status_sub
            yyyp_saved = yyyp_record.save()
            print(f"更新yyyp_sell表成功: ID={weapon_ID}, status={weapon_status}, status_sub={weapon_status_sub}")
        else:
            print(f"yyyp_sell表中未找到记录: ID={weapon_ID}")
            return jsonify({'success': False, 'error': 'yyyp_sell表中记录不存在'}), 404
        
        # 更新通用sell表
        sell_records = SellModel.find_all("ID LIKE ? AND \"from\" = 'yyyp'", (f"{weapon_ID}%",))
        sell_updated_count = 0
        for sell_record in sell_records:
            sell_record.status = weapon_status
            if weapon_status_sub is not None:
                sell_record.status_sub = weapon_status_sub
            sell_record.save()
            sell_updated_count += 1
        print(f"更新通用sell表成功: 共更新{sell_updated_count}条记录")
        
        if yyyp_saved:
            return jsonify({'success': True, 'message': '更新成功'}), 200
        else:
            return jsonify({'success': False, 'error': '更新失败'}), 500
            
    except Exception as e:
        print(f"更新销售数据失败: {e}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500


@youpin898SellV1.route('/selectApexTime/<data_user>', methods=['get'])
def selectApexTime(data_user):
    try:
        records = YyypSellModel.find_all(
            "data_user = ? ORDER BY order_time DESC", 
            (data_user,), 
            limit=1
        )
        if records:
            data = str(records[0].order_time)
        else:
            data = "0"
        return jsonify(data), 200
    except Exception as e:
        print(f"查询最新时间失败: {e}")
        return jsonify("0"), 500

@youpin898SellV1.route('/getCount/<data_user>', methods=['get'])
def getCount(data_user):
    try:
        records = YyypSellModel.find_all("data_user = ?", (data_user,))
        data = str(len(records))
        return data, 200
    except Exception as e:
        print(f"查询记录数量失败: {e}")
        return "0", 500
    

@youpin898SellV1.route('/insert_webside_selldata', methods=['post'])
def insert_webside_selldata():
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
        price_original = data['price_original']
        buyer_user_name = data['buyer_user_name']
        status = data['status']
        status_sub = data['status_sub']
        data_from = data['from']
        order_time = data['order_time']
        steamid = data['steam_id']
        data_user = data['data_user']
        
        # 处理weapon_float字符串'NULL'转换为None
        if weapon_float == 'NULL':
            weapon_float = None
        elif weapon_float is not None:
            try:
                weapon_float = float(weapon_float)
            except (ValueError, TypeError):
                weapon_float = None
        
        # 这些字段在主表已取消，但yyyp分表仍需要
        try:
            sell_number = int(data['sell_number'])
        except (TypeError, ValueError):
            sell_number = None
        try:
            err_number = int(data['err_number'])
        except (TypeError, ValueError):
            err_number = None
        price_all = data['price_all']

        # 插入到yyyp_sell表
        print(f"插入悠悠有品销售记录到yyyp_sell表，ID: {ID}")
        yyyp_sell_record = YyypSellModel()
        yyyp_sell_record.ID = ID
        yyyp_sell_record.weapon_name = weapon_name
        yyyp_sell_record.weapon_type = weapon_type
        yyyp_sell_record.item_name = item_name
        yyyp_sell_record.weapon_float = weapon_float
        yyyp_sell_record.float_range = float_range
        yyyp_sell_record.price = price
        yyyp_sell_record.price_original = price_original
        yyyp_sell_record.buyer_name = buyer_user_name
        yyyp_sell_record.status = status
        yyyp_sell_record.status_sub = status_sub
        yyyp_sell_record.order_time = order_time
        yyyp_sell_record.steam_id = steamid
        yyyp_sell_record.sell_number = sell_number
        yyyp_sell_record.err_number = err_number
        yyyp_sell_record.price_all = price_all
        yyyp_sell_record.data_user = data_user
        setattr(yyyp_sell_record, 'from', 'yyyp')
        
        yyyp_saved = yyyp_sell_record.save()
        print(f"yyyp_sell表保存结果: {yyyp_saved}")

        # 初始化sell_saved变量
        sell_saved = True
        if sell_number == 1:
            print(f"插入销售记录到sell表，ID: {ID}")
            sell_record = SellModel()
            sell_record.ID = ID
            sell_record.weapon_name = weapon_name
            sell_record.weapon_type = weapon_type
            sell_record.item_name = item_name
            sell_record.weapon_float = weapon_float
            sell_record.float_range = float_range
            sell_record.price = price
            sell_record.price_original = price_original
            sell_record.buyer_name = buyer_user_name
            sell_record.status = status
            sell_record.status_sub = status_sub
            sell_record.order_time = order_time
            sell_record.steam_id = steamid
            sell_record.data_user = data_user
            setattr(sell_record, 'from', 'yyyp')
            
            sell_saved = sell_record.save()
            print(f"sell表保存结果: {sell_saved}")

        if yyyp_saved and sell_saved:
            return jsonify({
                'success': True,
                'message': '悠悠有品销售数据插入成功',
                'data': {
                    'id': ID,
                    'weapon_name': weapon_name,
                    'item_name': item_name,
                    'price': price,
                    'price_original': price_original
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"悠悠有品销售数据插入错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

@youpin898SellV1.route('/insert_main_selldata', methods=['post'])
def insert_main_selldata():
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
        price_original = data['price_original']
        buyer_user_name = data['buyer_user_name']
        status = data['status']
        status_sub = data['status_sub']
        data_from = data['from']
        order_time = data['order_time']
        steamid = data['steam_id']
        data_user = data['data_user']
        
        # 处理weapon_float字符串'NULL'转换为None
        if weapon_float == 'NULL':
            weapon_float = None
        elif weapon_float is not None:
            try:
                weapon_float = float(weapon_float)
            except (ValueError, TypeError):
                weapon_float = None

        # 插入到通用sell表
        print(f"插入主销售记录到sell表，ID: {ID}")
        sell_record = SellModel()
        sell_record.ID = ID
        sell_record.weapon_name = weapon_name
        sell_record.weapon_type = weapon_type
        sell_record.item_name = item_name
        sell_record.weapon_float = weapon_float
        sell_record.float_range = float_range
        sell_record.price = price
        sell_record.price_original = price_original
        sell_record.buyer_name = buyer_user_name
        sell_record.status = status
        sell_record.status_sub = status_sub
        sell_record.order_time = order_time
        sell_record.steam_id = steamid
        sell_record.data_user = data_user
        setattr(sell_record, 'from', data_from)
        
        sell_saved = sell_record.save()
        print(f"sell表保存结果: {sell_saved}")

        if sell_saved:
            return jsonify({
                'success': True,
                'message': '主销售数据插入成功',
                'data': {
                    'id': ID,
                    'weapon_name': weapon_name,
                    'item_name': item_name,
                    'price': price,
                    'price_original': price_original
                }
            }), 200
        else:
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
            
    except Exception as e:
        print(f"主销售数据插入错误: {str(e)}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

@youpin898SellV1.route('/countSellNumber', methods=['get'])
def countSellNumber():
    try:
        records = SellModel.find_all()
        count = len(records)
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询销售数量失败: {e}")
        return jsonify({"count": 0}), 500

@youpin898SellV1.route('/getSellData/<int:min>/<int:max>', methods=['get'])
def getSellData(min, max):
    try:
        records = SellModel.find_all(
            "1=1 ORDER BY order_time DESC", 
            (), 
            limit=max, 
            offset=min
        )
        data = []
        for record in records:
            data.append([
                record.ID, record.item_name, record.weapon_name, 
                record.weapon_type, record.weapon_float, record.float_range, 
                record.price, getattr(record, 'from', ''), record.order_time, record.status
            ])
        return jsonify(data), 200
    except Exception as e:
        print(f"查询销售数据失败: {e}")
        return jsonify([]), 500

@youpin898SellV1.route('/selectSellWeaponName/<itemName>', methods=['get'])
def selectSellWeaponName(itemName):
    try:
        records = SellModel.find_all(
            "item_name LIKE ? OR weapon_name LIKE ?", 
            (f"%{itemName}%", f"%{itemName}%")
        )
        data = []
        for record in records:
            data.append([
                record.ID, record.item_name, record.weapon_name, 
                record.weapon_type, record.weapon_float, record.float_range, 
                record.price, getattr(record, 'from', ''), record.order_time, record.status
            ])
        return jsonify(data), 200
    except Exception as e:
        print(f"查询武器名称失败: {e}")
        return jsonify([]), 500

@youpin898SellV1.route('/getSellDataByStatus/<status>/<int:min>/<int:max>', methods=['get'])
def getSellDataByStatus(status, min, max):
    try:
        if status == 'all':
            records = SellModel.find_all(
                "1=1 ORDER BY order_time DESC", 
                (), 
                limit=max, 
                offset=min
            )
        else:
            records = SellModel.find_all(
                "status = ? ORDER BY order_time DESC", 
                (status,), 
                limit=max, 
                offset=min
            )
        
        data = []
        for record in records:
            data.append([
                record.ID, record.item_name, record.weapon_name, 
                record.weapon_type, record.weapon_float, record.float_range, 
                record.price, getattr(record, 'from', ''), record.order_time, record.status
            ])
        return jsonify(data), 200
    except Exception as e:
        print(f"查询状态销售数据失败: {e}")
        return jsonify([]), 500

