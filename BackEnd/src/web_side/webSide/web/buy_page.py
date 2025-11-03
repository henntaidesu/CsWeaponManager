from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.now_time import today
from src.db_manager.index.buy import BuyModel
import requests

webBuyV1 = Blueprint('webBuyV1', __name__)

@webBuyV1.route('/countBuyNumber', methods=['get'])
def countBuyNumber():
    try:
        records = BuyModel.find_all()
        count = len(records)
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询购买数量失败: {e}")
        return jsonify({"count": 0}), 500

@webBuyV1.route('/getBuyData/<int:min>/<int:max>', methods=['get'])
def getNowBuyingList(min, max):
    try:
        records = BuyModel.find_all(
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
        print(f"查询购买数据失败: {e}")
        return jsonify([]), 500
    

@webBuyV1.route('/selectBuyWeaponName/<itemName>', methods=['get'])
def selectBuyWeaponName(itemName):
    sql = f"SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status, status_sub FROM buy WHERE item_name LIKE '%{itemName}%' OR weapon_name LIKE '%{itemName}%';"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webBuyV1.route('/getBuyDataByStatus/<status>/<int:min>/<int:max>', methods=['get'])
def getBuyDataByStatus(status, min, max):
    if status == 'all':
        sql = f"SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status, status_sub FROM buy LIMIT {max} OFFSET {min};"
    else:
        sql = f"SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, \"from\", order_time, status, status_sub FROM buy WHERE status = '{status}' LIMIT {max} OFFSET {min};"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webBuyV1.route('/getBuyStats', methods=['get'])
def getBuyStats():
    sql = """
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM buy
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

@webBuyV1.route('/getBuyTotalStats', methods=['POST'])
def getBuyTotalStats():
    sql = """
    SELECT COUNT(*) as total_count, COALESCE(SUM(price), 0) as total_amount
    FROM buy
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag and len(data) > 0:
            stats = data[0]
            return jsonify([stats[0], round(float(stats[1]), 2)]), 200
    return jsonify([0, 0]), 500

@webBuyV1.route('/getBuyStatsBySearch/<itemName>', methods=['GET'])
def getBuyStatsBySearch(itemName):
    search_pattern = f"%{itemName}%"
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM buy
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

@webBuyV1.route('/getBuyStatsByStatus/<status>', methods=['GET'])
def getBuyStatsByStatus(status):
    if status == 'all':
        return getBuyStats()
    
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM buy
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

@webBuyV1.route('/getBuyDataByTimeRange/<start_date>/<end_date>/<int:min>/<int:max>', methods=['GET'])
def getBuyDataByTimeRange(start_date, end_date, min, max):
    sql = f"""
    SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, `from`, order_time, status, status_sub 
    FROM buy 
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

@webBuyV1.route('/getBuyStatsByTimeRange/<start_date>/<end_date>', methods=['GET'])
def getBuyStatsByTimeRange(start_date, end_date):
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status != '已取消' THEN price ELSE 0 END), 0) as total_amount,
        COALESCE(AVG(CASE WHEN status != '已取消' THEN price ELSE NULL END), 0) as avg_price,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = '待收货' THEN 1 END) as pending_count
    FROM buy
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

@webBuyV1.route('/searchBuyByTimeRange/<start_date>/<end_date>', methods=['GET'])
def searchBuyByTimeRange(start_date, end_date):
    sql = f"""
    SELECT ID, item_name, weapon_name, weapon_type, weapon_float, float_range, price, `from`, order_time, status 
    FROM buy 
    WHERE DATE(order_time) >= '{start_date}' AND DATE(order_time) <= '{end_date}'
    ORDER BY order_time DESC;
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500