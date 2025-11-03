from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.now_time import today
from src.db_manager.steam.steam_buy import SteamBuyModel
from src.db_manager.steam.steam_sell import SteamSellModel
import requests

webSteamMarketV1 = Blueprint('webSteamMarketV1', __name__)

# ==================== Helper Functions ====================

def get_distinct_game_names(model_class):
    """获取不重复的游戏名称列表"""
    try:
        records = model_class.find_all("game_name IS NOT NULL")
        game_names = list(set([record.game_name for record in records if record.game_name]))
        game_names.sort()
        # 将 Counter-Strike 2 排在第一位
        if 'Counter-Strike 2' in game_names:
            game_names.remove('Counter-Strike 2')
            game_names.insert(0, 'Counter-Strike 2')
        return game_names
    except Exception as e:
        print(f"获取游戏名称失败: {e}")
        return []

def calculate_stats(records):
    """计算统计数据"""
    if not records:
        return {
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }
    
    total_count = len(records)
    total_amount = sum([record.price for record in records if record.price])
    avg_price = total_amount / total_count if total_count > 0 else 0
    
    return {
        "total_count": total_count,
        "total_amount": round(float(total_amount), 2),
        "avg_price": round(float(avg_price), 2),
        "completed_count": total_count,  # Steam数据都是已完成
        "cancelled_count": 0,
        "pending_count": 0
    }

def record_to_array(record):
    """将记录转换为数组格式"""
    return [
        record.ID, record.item_name, record.weapon_name,
        record.weapon_type, record.weapon_float, record.float_range,
        record.price, 'Steam', record.trade_date, '已完成', record.game_name
    ]

# ==================== Steam Buy APIs ====================

@webSteamMarketV1.route('/getBuyGameNames', methods=['GET'])
def getBuyGameNames():
    """获取Steam购买记录中的所有游戏名称"""
    try:
        game_names = get_distinct_game_names(SteamBuyModel)
        return jsonify(game_names), 200
    except Exception as e:
        print(f"获取购买游戏名称失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/countSteamBuyNumber', methods=['GET'])
def countSteamBuyNumber():
    """获取Steam购买记录总数"""
    try:
        count = SteamBuyModel.count()
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询Steam购买数量失败: {e}")
        return jsonify({"count": 0}), 500

@webSteamMarketV1.route('/getSteamBuyData/<int:min>/<int:max>', methods=['GET'])
def getSteamBuyData(min, max):
    """获取Steam购买数据（分页）"""
    try:
        records = SteamBuyModel.find_all(
            "1=1 ORDER BY trade_date DESC",
            (),
            limit=max,
            offset=min
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询Steam购买数据失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/selectSteamBuyWeaponName/<itemName>', methods=['GET'])
def selectSteamBuyWeaponName(itemName):
    """根据武器名称搜索Steam购买记录"""
    try:
        records = SteamBuyModel.find_all(
            "item_name LIKE ? OR weapon_name LIKE ? ORDER BY trade_date DESC",
            (f"%{itemName}%", f"%{itemName}%")
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"搜索Steam购买记录失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamBuyDataByGameName/<gameName>/<int:min>/<int:max>', methods=['GET'])
def getSteamBuyDataByGameName(gameName, min, max):
    """根据游戏名称获取Steam购买数据（分页）"""
    try:
        records = SteamBuyModel.find_all(
            "game_name = ? ORDER BY trade_date DESC",
            (gameName,),
            limit=max,
            offset=min
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"根据游戏名称查询Steam购买数据失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamBuyDataByStatus/<status>/<int:min>/<int:max>', methods=['GET'])
def getSteamBuyDataByStatus(status, min, max):
    """根据状态获取Steam购买数据（Steam数据都是已完成状态）"""
    try:
        if status == 'all' or status == '已完成':
            records = SteamBuyModel.find_all(
                "1=1 ORDER BY trade_date DESC",
                (),
                limit=max,
                offset=min
            )
            data = [record_to_array(record) for record in records]
            return jsonify(data), 200
        else:
            # 其他状态返回空数据，因为Steam数据都是已完成的
            return jsonify([]), 200
    except Exception as e:
        print(f"根据状态查询Steam购买数据失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamBuyStats', methods=['GET'])
def getSteamBuyStats():
    """获取Steam购买统计数据"""
    try:
        records = SteamBuyModel.find_all()
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"获取Steam购买统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/getSteamBuyStatsBySearch/<itemName>', methods=['GET'])
def getSteamBuyStatsBySearch(itemName):
    """根据搜索关键词获取Steam购买统计"""
    try:
        records = SteamBuyModel.find_all(
            "item_name LIKE ? OR weapon_name LIKE ?",
            (f"%{itemName}%", f"%{itemName}%")
        )
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"根据搜索获取Steam购买统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/getSteamBuyStatsByGameName/<gameName>', methods=['GET'])
def getSteamBuyStatsByGameName(gameName):
    """根据游戏名称获取Steam购买统计"""
    try:
        records = SteamBuyModel.find_all("game_name = ?", (gameName,))
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"根据游戏名称获取Steam购买统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/getSteamBuyStatsByStatus/<status>', methods=['GET'])
def getSteamBuyStatsByStatus(status):
    """根据状态获取Steam购买统计"""
    try:
        if status == 'all' or status == '已完成':
            records = SteamBuyModel.find_all()
            stats = calculate_stats(records)
            return jsonify(stats), 200
        else:
            # 其他状态返回0统计
            return jsonify({
                "total_count": 0,
                "total_amount": 0,
                "avg_price": 0,
                "completed_count": 0,
                "cancelled_count": 0,
                "pending_count": 0
            }), 200
    except Exception as e:
        print(f"根据状态获取Steam购买统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/searchSteamBuyByTimeRange/<startDate>/<endDate>', methods=['GET'])
def searchSteamBuyByTimeRange(startDate, endDate):
    """根据时间范围搜索Steam购买记录"""
    try:
        records = SteamBuyModel.find_all(
            "DATE(trade_date) BETWEEN ? AND ? ORDER BY trade_date DESC",
            (startDate, endDate)
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"根据时间范围搜索Steam购买记录失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamBuyStatsByTimeRange/<startDate>/<endDate>', methods=['GET'])
def getSteamBuyStatsByTimeRange(startDate, endDate):
    """根据时间范围获取Steam购买统计"""
    try:
        records = SteamBuyModel.find_all(
            "DATE(trade_date) BETWEEN ? AND ?",
            (startDate, endDate)
        )
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"根据时间范围获取Steam购买统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

# ==================== Steam Sell APIs ====================

@webSteamMarketV1.route('/getSellGameNames', methods=['GET'])
def getSellGameNames():
    """获取Steam销售记录中的所有游戏名称"""
    try:
        game_names = get_distinct_game_names(SteamSellModel)
        return jsonify(game_names), 200
    except Exception as e:
        print(f"获取销售游戏名称失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/countSteamSellNumber', methods=['GET'])
def countSteamSellNumber():
    """获取Steam销售记录总数"""
    try:
        count = SteamSellModel.count()
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询Steam销售数量失败: {e}")
        return jsonify({"count": 0}), 500

@webSteamMarketV1.route('/getSteamSellData/<int:min>/<int:max>', methods=['GET'])
def getSteamSellData(min, max):
    """获取Steam销售数据（分页）"""
    try:
        records = SteamSellModel.find_all(
            "1=1 ORDER BY trade_date DESC",
            (),
            limit=max,
            offset=min
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询Steam销售数据失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/selectSteamSellWeaponName/<itemName>', methods=['GET'])
def selectSteamSellWeaponName(itemName):
    """根据武器名称搜索Steam销售记录"""
    try:
        records = SteamSellModel.find_all(
            "item_name LIKE ? OR weapon_name LIKE ? ORDER BY trade_date DESC",
            (f"%{itemName}%", f"%{itemName}%")
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"搜索Steam销售记录失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamSellDataByGameName/<gameName>/<int:min>/<int:max>', methods=['GET'])
def getSteamSellDataByGameName(gameName, min, max):
    """根据游戏名称获取Steam销售数据（分页）"""
    try:
        records = SteamSellModel.find_all(
            "game_name = ? ORDER BY trade_date DESC",
            (gameName,),
            limit=max,
            offset=min
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"根据游戏名称查询Steam销售数据失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamSellDataByStatus/<status>/<int:min>/<int:max>', methods=['GET'])
def getSteamSellDataByStatus(status, min, max):
    """根据状态获取Steam销售数据（Steam数据都是已完成状态）"""
    try:
        if status == 'all' or status == '已完成':
            records = SteamSellModel.find_all(
                "1=1 ORDER BY trade_date DESC",
                (),
                limit=max,
                offset=min
            )
            data = [record_to_array(record) for record in records]
            return jsonify(data), 200
        else:
            # 其他状态返回空数据，因为Steam数据都是已完成的
            return jsonify([]), 200
    except Exception as e:
        print(f"根据状态查询Steam销售数据失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamSellStats', methods=['GET'])
def getSteamSellStats():
    """获取Steam销售统计数据"""
    try:
        records = SteamSellModel.find_all()
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"获取Steam销售统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/getSteamSellStatsBySearch/<itemName>', methods=['GET'])
def getSteamSellStatsBySearch(itemName):
    """根据搜索关键词获取Steam销售统计"""
    try:
        records = SteamSellModel.find_all(
            "item_name LIKE ? OR weapon_name LIKE ?",
            (f"%{itemName}%", f"%{itemName}%")
        )
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"根据搜索获取Steam销售统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/getSteamSellStatsByGameName/<gameName>', methods=['GET'])
def getSteamSellStatsByGameName(gameName):
    """根据游戏名称获取Steam销售统计"""
    try:
        records = SteamSellModel.find_all("game_name = ?", (gameName,))
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"根据游戏名称获取Steam销售统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/getSteamSellStatsByStatus/<status>', methods=['GET'])
def getSteamSellStatsByStatus(status):
    """根据状态获取Steam销售统计"""
    try:
        if status == 'all' or status == '已完成':
            records = SteamSellModel.find_all()
            stats = calculate_stats(records)
            return jsonify(stats), 200
        else:
            # 其他状态返回0统计
            return jsonify({
                "total_count": 0,
                "total_amount": 0,
                "avg_price": 0,
                "completed_count": 0,
                "cancelled_count": 0,
                "pending_count": 0
            }), 200
    except Exception as e:
        print(f"根据状态获取Steam销售统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

@webSteamMarketV1.route('/searchSteamSellByTimeRange/<startDate>/<endDate>', methods=['GET'])
def searchSteamSellByTimeRange(startDate, endDate):
    """根据时间范围搜索Steam销售记录"""
    try:
        records = SteamSellModel.find_all(
            "DATE(trade_date) BETWEEN ? AND ? ORDER BY trade_date DESC",
            (startDate, endDate)
        )
        data = [record_to_array(record) for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"根据时间范围搜索Steam销售记录失败: {e}")
        return jsonify([]), 500

@webSteamMarketV1.route('/getSteamSellStatsByTimeRange/<startDate>/<endDate>', methods=['GET'])
def getSteamSellStatsByTimeRange(startDate, endDate):
    """根据时间范围获取Steam销售统计"""
    try:
        records = SteamSellModel.find_all(
            "DATE(trade_date) BETWEEN ? AND ?",
            (startDate, endDate)
        )
        stats = calculate_stats(records)
        return jsonify(stats), 200
    except Exception as e:
        print(f"根据时间范围获取Steam销售统计失败: {e}")
        return jsonify({
            "total_count": 0,
            "total_amount": 0,
            "avg_price": 0,
            "completed_count": 0,
            "cancelled_count": 0,
            "pending_count": 0
        }), 500

# ==================== Combined APIs ====================

@webSteamMarketV1.route('/getSteamMarketStats', methods=['GET'])
def getSteamMarketStats():
    """获取Steam市场综合统计数据（购买+销售）"""
    try:
        # 获取购买统计
        buy_records = SteamBuyModel.find_all()
        buy_count = len(buy_records)
        buy_total = sum([record.price for record in buy_records if record.price])
        buy_avg = buy_total / buy_count if buy_count > 0 else 0
        
        # 获取销售统计
        sell_records = SteamSellModel.find_all()
        sell_count = len(sell_records)
        sell_total = sum([record.price for record in sell_records if record.price])
        sell_avg = sell_total / sell_count if sell_count > 0 else 0
        
        # 计算净收益
        net_profit = sell_total - buy_total
        
        return jsonify({
            "buy_count": buy_count,
            "buy_total": round(float(buy_total), 2),
            "buy_avg": round(float(buy_avg), 2),
            "sell_count": sell_count,
            "sell_total": round(float(sell_total), 2),
            "sell_avg": round(float(sell_avg), 2),
            "net_profit": round(float(net_profit), 2),
            "total_transactions": buy_count + sell_count
        }), 200
    except Exception as e:
        print(f"获取Steam市场综合统计失败: {e}")
        return jsonify({
            "buy_count": 0,
            "buy_total": 0,
            "buy_avg": 0,
            "sell_count": 0,
            "sell_total": 0,
            "sell_avg": 0,
            "net_profit": 0,
            "total_transactions": 0
        }), 500
