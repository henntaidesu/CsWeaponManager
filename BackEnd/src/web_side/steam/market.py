from flask import jsonify, request, Blueprint
from src.db_manager.steam.steam_buy import SteamBuyModel
from src.db_manager.steam.steam_sell import SteamSellModel
from src.execution_db import Date_base
from datetime import datetime

steamMarketV1 = Blueprint('steamMarketV1', __name__)

@steamMarketV1.route('/countData/<data_user>', methods=['get'])
def countData(data_user):
    try:
        # 使用对象化方式查询购买记录数量
        buy_records = SteamBuyModel.find_all("data_user = ?", (data_user,))
        buy_count = len(buy_records)
        
        # 使用对象化方式查询销售记录数量
        sell_records = SteamSellModel.find_all("data_user = ?", (data_user,))
        sell_count = len(sell_records)
        
        # 计算总数量
        total_count = buy_count + sell_count
        
        print(f"Steam用户 {data_user} 的数据统计: 购买{buy_count}条, 销售{sell_count}条, 总计{total_count}条")
        
        return jsonify({
            "success": True,
            "data": {
                "user_id": data_user,
                "buy_count": buy_count,
                "sell_count": sell_count,
                "count": total_count
            }
        }), 200
        
    except Exception as e:
        print(f"查询Steam数据统计失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": f"查询失败: {str(e)}",
            "data": {
                "user_id": data_user,
                "buy_count": 0,
                "sell_count": 0,
                "total_count": 0
            }
        }), 500

@steamMarketV1.route('/getLatestData/<data_user>', methods=['GET'])
def getLatestData(data_user):
    """获取指定用户的最新一条交易记录（购买或销售）并返回总数统计"""
    try:
        # 查询购买记录总数
        buy_count_sql = f"""
        SELECT COUNT(*) FROM steam_buy WHERE data_user = '{data_user}'
        """
        buy_count_result = Date_base().select(buy_count_sql)
        buy_count = buy_count_result[1][0][0] if buy_count_result and buy_count_result[0] else 0

        # 查询销售记录总数
        sell_count_sql = f"""
        SELECT COUNT(*) FROM steam_sell WHERE data_user = '{data_user}'
        """
        sell_count_result = Date_base().select(sell_count_sql)
        sell_count = sell_count_result[1][0][0] if sell_count_result and sell_count_result[0] else 0

        # 计算总数
        total_count = buy_count + sell_count

        # 查询最新购买记录
        buy_sql = f"""
        SELECT ID, trade_date, 'buy' as type
        FROM steam_buy
        WHERE data_user = '{data_user}'
        ORDER BY trade_date DESC
        LIMIT 1
        """
        buy_result = Date_base().select(buy_sql)

        # 查询最新销售记录
        sell_sql = f"""
        SELECT ID, trade_date, 'sell' as type
        FROM steam_sell
        WHERE data_user = '{data_user}'
        ORDER BY trade_date DESC
        LIMIT 1
        """
        sell_result = Date_base().select(sell_sql)

        latest_buy = None
        latest_sell = None

        if buy_result and len(buy_result) == 2 and buy_result[0] and len(buy_result[1]) > 0:
            latest_buy = buy_result[1][0]

        if sell_result and len(sell_result) == 2 and sell_result[0] and len(sell_result[1]) > 0:
            latest_sell = sell_result[1][0]

        # 比较两者的交易时间，返回最新的那条
        if latest_buy and latest_sell:
            if latest_buy[1] > latest_sell[1]:
                return jsonify({
                    "ID": latest_buy[0],
                    "trade_date": latest_buy[1],
                    "buy_count": buy_count,
                    "sell_count": sell_count,
                    "total_count": total_count
                }), 200
            else:
                return jsonify({
                    "ID": latest_sell[0],
                    "trade_date": latest_sell[1],
                    "buy_count": buy_count,
                    "sell_count": sell_count,
                    "total_count": total_count
                }), 200
        elif latest_buy:
            return jsonify({
                "ID": latest_buy[0],
                "trade_date": latest_buy[1],
                "buy_count": buy_count,
                "sell_count": sell_count,
                "total_count": total_count
            }), 200
        elif latest_sell:
            return jsonify({
                "ID": latest_sell[0],
                "trade_date": latest_sell[1],
                "buy_count": buy_count,
                "sell_count": sell_count,
                "total_count": total_count
            }), 200
        else:
            return jsonify({
                "ID": None,
                "trade_date": None,
                "buy_count": buy_count,
                "sell_count": sell_count,
                "total_count": total_count
            }), 200

    except Exception as e:
        print(f"获取最新交易数据失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({
            "ID": None,
            "trade_date": None,
            "buy_count": 0,
            "sell_count": 0,
            "total_count": 0
        }), 500


@steamMarketV1.route('/getEarliestData/<data_user>', methods=['GET'])
def getEarliestData(data_user):
    """获取指定用户的最早一条交易记录（购买或销售）"""
    try:
        # 查询最早购买记录
        buy_sql = f"""
        SELECT ID, trade_date, 'buy' as type
        FROM steam_buy
        WHERE data_user = '{data_user}'
        ORDER BY trade_date ASC
        LIMIT 1
        """
        buy_result = Date_base().select(buy_sql)

        # 查询最早销售记录
        sell_sql = f"""
        SELECT ID, trade_date, 'sell' as type
        FROM steam_sell
        WHERE data_user = '{data_user}'
        ORDER BY trade_date ASC
        LIMIT 1
        """
        sell_result = Date_base().select(sell_sql)
        
        earliest_buy = None
        earliest_sell = None
        
        if buy_result and len(buy_result) == 2 and buy_result[0] and len(buy_result[1]) > 0:
            earliest_buy = buy_result[1][0]
        
        if sell_result and len(sell_result) == 2 and sell_result[0] and len(sell_result[1]) > 0:
            earliest_sell = sell_result[1][0]
        
        # 比较两者的交易时间，返回最早的那条
        if earliest_buy and earliest_sell:
            if earliest_buy[1] < earliest_sell[1]:
                return jsonify({
                    "ID": earliest_buy[0],
                    "trade_date": earliest_buy[1]
                }), 200
            else:
                return jsonify({
                    "ID": earliest_sell[0],
                    "trade_date": earliest_sell[1]
                }), 200
        elif earliest_buy:
            return jsonify({
                "ID": earliest_buy[0],
                "trade_date": earliest_buy[1]
            }), 200
        elif earliest_sell:
            return jsonify({
                "ID": earliest_sell[0],
                "trade_date": earliest_sell[1]
            }), 200
        else:
            return jsonify({"ID": None, "trade_date": None}), 200
            
    except Exception as e:
        print(f"获取最早交易数据失败: {e}")
        import traceback
        print(f"详细错误信息: {traceback.format_exc()}")
        return jsonify({"ID": None, "trade_date": None}), 500

@steamMarketV1.route('/insertNewData', methods=['POST'])
def insertNewData():
    """插入新的Steam市场交易数据"""
    try:
        data = request.get_json()
        if not data:
            print("错误：无效的JSON数据")
            return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
        
        # 获取当前用户（这里需要根据实际认证机制获取）
        trade_type = data.get('trade_type')
        
        if trade_type == '+':
            # 购买记录 - 插入steam_buy表
            buy_record = SteamBuyModel()
            buy_record.ID = data.get('ID')
            buy_record.asset_id = data.get('asset_id')
            buy_record.price = data.get('price')
            buy_record.trade_date = data.get('trade_date')
            buy_record.listing_date = data.get('listing_date')
            buy_record.game_name = data.get('game_name')
            buy_record.weapon_type = data.get('weapon_type')
            buy_record.weapon_name = data.get('weapon_name')
            buy_record.item_name = data.get('item_name')
            buy_record.float_range = data.get('exterior_wear')
            buy_record.inspect_link = data.get('inspect_link')
            buy_record.data_user = data.get('steamId')
            saved = buy_record.save()
            operation_type = '购买'
            
        elif trade_type == '-':
            # 销售记录 - 插入steam_sell表
            sell_record = SteamSellModel()
            sell_record.ID = data.get('ID')
            sell_record.asset_id = data.get('asset_id')
            sell_record.price = data.get('price')
            sell_record.price_original = data.get('price_original')
            sell_record.trade_date = data.get('trade_date')
            sell_record.listing_date = data.get('listing_date')
            sell_record.game_name = data.get('game_name')
            sell_record.weapon_type = data.get('weapon_type')
            sell_record.weapon_name = data.get('weapon_name')
            sell_record.item_name = data.get('item_name')
            sell_record.float_range = data.get('exterior_wear')
            sell_record.inspect_link = data.get('inspect_link')
            sell_record.data_user = data.get('steamId')
        
            saved = sell_record.save()
            # print(f"销售记录保存结果: {saved}")
            operation_type = '销售'
        else:
            return jsonify({'success': False, 'error': '无效的交易类型'}), 400
        
        # 检查是否保存成功
        # print(f"最终保存结果: {saved}")
        if saved:
            # print(f"{operation_type}数据插入成功")
            return jsonify({
                'success': True,
                'message': f'{operation_type}数据插入成功',
                'data': {
                    'id': data.get('ID'),
                    'trade_type': trade_type,
                    'operation_type': operation_type,
                    'weapon_name': data.get('weapon_name'),
                    'item_name': data.get('item_name'),
                    'price': data.get('price')
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

