from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.now_time import today
from src.db_manager.index.sell import SellModel
import requests

webSellV1 = Blueprint('webSellV1', __name__)

@webSellV1.route('/countSellNumber', methods=['get'])
def countSellNumber():
    try:
        records = SellModel.find_all()
        count = len(records)
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询销售数量失败: {e}")
        return jsonify({"count": 0}), 500

@webSellV1.route('/getSellData/<int:min>/<int:max>', methods=['get'])
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
                record.price, getattr(record, 'from', ''), record.order_time, record.status,
                record.status_sub
            ])
        return jsonify(data), 200
    except Exception as e:
        print(f"查询销售数据失败: {e}")
        return jsonify([]), 500
    

@webSellV1.route('/selectSellWeaponName/<itemName>', methods=['get'])
def selectSellWeaponName(itemName):
    sql = f"SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status, status_sub FROM sell WHERE item_name LIKE '%{itemName}%' OR weapon_name LIKE '%{itemName}%';"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webSellV1.route('/getSellDataByStatus/<status>/<int:min>/<int:max>', methods=['get'])
def getSellDataByStatus(status, min, max):
    if status == 'all':
        sql = f"SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status, status_sub FROM sell ORDER BY order_time DESC LIMIT {max} OFFSET {min};"
    else:
        sql = f"SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status, status_sub FROM sell WHERE status = '{status}' ORDER BY order_time DESC LIMIT {max} OFFSET {min};"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webSellV1.route('/getSellStats', methods=['get'])
def getSellStats():
    sql = """
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM sell
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag and len(data) > 0:
            stats = data[0]
            return jsonify({
                "total_count": stats[0],
                "total_amount": round(float(stats[1]), 2),
                "avg_price": round(float(stats[2]), 2),
                "completed_count": stats[3],
                "cancelled_count": stats[4],
                "pending_count": stats[5]
            }), 200
    return "查询失败", 500

@webSellV1.route('/getSellStatsBySearch/<itemName>', methods=['GET'])
def getSellStatsBySearch(itemName):
    search_pattern = f"%{itemName}%"
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM sell
    WHERE item_name LIKE '{search_pattern}' OR weapon_name LIKE '{search_pattern}'
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag and len(data) > 0:
            stats = data[0]
            return jsonify({
                "total_count": stats[0],
                "total_amount": round(float(stats[1]), 2),
                "avg_price": round(float(stats[2]), 2),
                "completed_count": stats[3],
                "cancelled_count": stats[4],
                "pending_count": stats[5]
            }), 200
    return "查询失败", 500

@webSellV1.route('/getSellStatsByStatus/<status>', methods=['GET'])
def getSellStatsByStatus(status):
    if status == 'all':
        return getSellStats()
    
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM sell
    WHERE status = '{status}'
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag and len(data) > 0:
            stats = data[0]
            return jsonify({
                "total_count": stats[0],
                "total_amount": round(float(stats[1]), 2),
                "avg_price": round(float(stats[2]), 2),
                "completed_count": stats[3],
                "cancelled_count": stats[4],
                "pending_count": stats[5]
            }), 200
    return "查询失败", 500

@webSellV1.route('/getSellDataByTimeRange/<start_date>/<end_date>/<int:min>/<int:max>', methods=['GET'])
def getSellDataByTimeRange(start_date, end_date, min, max):
    sql = f"""
    SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status 
    FROM sell 
    WHERE DATE(order_time) >= '{start_date}' AND DATE(order_time) <= '{end_date}'
    ORDER BY order_time DESC 
    LIMIT {max} OFFSET {min};
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webSellV1.route('/getSellStatsByTimeRange/<start_date>/<end_date>', methods=['GET'])
def getSellStatsByTimeRange(start_date, end_date):
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM sell
    WHERE DATE(order_time) >= '{start_date}' AND DATE(order_time) <= '{end_date}'
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag and len(data) > 0:
            stats = data[0]
            return jsonify({
                "total_count": stats[0],
                "total_amount": round(float(stats[1]), 2),
                "avg_price": round(float(stats[2]), 2),
                "completed_count": stats[3],
                "cancelled_count": stats[4],
                "pending_count": stats[5]
            }), 200
    return "查询失败", 500

@webSellV1.route('/searchSellByTimeRange/<start_date>/<end_date>', methods=['GET'])
def searchSellByTimeRange(start_date, end_date):
    sql = f"""
    SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status 
    FROM sell 
    WHERE DATE(order_time) >= '{start_date}' AND DATE(order_time) <= '{end_date}'
    ORDER BY order_time DESC;
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500