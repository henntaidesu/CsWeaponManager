from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.now_time import today
import requests

webLentV1 = Blueprint('webLentV1', __name__)

@webLentV1.route('/countLentNumber', methods=['get'])
def countLentNumber():
    sql = "SELECT COUNT(*) FROM yyyp_lent"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify({"count": data[0][0]}), 200
    return "查询失败", 500

@webLentV1.route('/getLentData/<int:min>/<int:max>', methods=['get'])
def getLentData(min, max):
    sql = f"SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price, lenter_name, status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days FROM yyyp_lent ORDER BY lean_start_time DESC LIMIT {max} OFFSET {min};"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webLentV1.route('/selectLentWeaponName/<itemName>', methods=['get'])
def selectLentWeaponName(itemName):
    sql = f"SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price, lenter_name, status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days FROM yyyp_lent WHERE item_name LIKE '%{itemName}%' OR weapon_name LIKE '%{itemName}%';"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webLentV1.route('/getLentDataByStatus/<status>/<int:min>/<int:max>', methods=['get'])
def getLentDataByStatus(status, min, max):
    if status == 'all':
        sql = f"SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price, lenter_name, status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days FROM yyyp_lent ORDER BY lean_start_time DESC LIMIT {max} OFFSET {min};"
    else:
        sql = f"SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price, lenter_name, status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days FROM yyyp_lent WHERE status = '{status}' ORDER BY lean_start_time DESC LIMIT {max} OFFSET {min};"
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webLentV1.route('/getLentStats', methods=['get'])
def getLentStats():
    sql = """
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(price * total_Lease_Days), 0) as total_amount,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(SUM(total_Lease_Days), 0) as total_lease_days,
        COALESCE(AVG(total_Lease_Days), 0) as avg_lease_days,
        COUNT(CASE WHEN status = '租赁中' THEN 1 END) as renting_count,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count
    FROM yyyp_lent
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
                "total_lease_days": stats[3],
                "avg_lease_days": round(float(stats[4]), 1),
                "renting_count": stats[5],
                "completed_count": stats[6],
                "cancelled_count": stats[7]
            }), 200
    return "查询失败", 500

@webLentV1.route('/getLentDataByTimeRange/<start_date>/<end_date>/<int:min>/<int:max>', methods=['GET'])
def getLentDataByTimeRange(start_date, end_date, min, max):
    sql = f"""
    SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price, lenter_name, status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days 
    FROM yyyp_lent 
    WHERE DATE(lean_start_time) >= '{start_date}' AND DATE(lean_start_time) <= '{end_date}'
    ORDER BY lean_start_time DESC 
    LIMIT {max} OFFSET {min};
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500

@webLentV1.route('/getLentStatsByTimeRange/<start_date>/<end_date>', methods=['GET'])
def getLentStatsByTimeRange(start_date, end_date):
    sql = f"""
    SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(price * total_Lease_Days), 0) as total_amount,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(SUM(total_Lease_Days), 0) as total_lease_days,
        COALESCE(AVG(total_Lease_Days), 0) as avg_lease_days,
        COUNT(CASE WHEN status = '租赁中' THEN 1 END) as renting_count,
        COUNT(CASE WHEN status = '已完成' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = '已取消' THEN 1 END) as cancelled_count
    FROM yyyp_lent
    WHERE DATE(lean_start_time) >= '{start_date}' AND DATE(lean_start_time) <= '{end_date}'
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
                "total_lease_days": stats[3],
                "avg_lease_days": round(float(stats[4]), 1),
                "renting_count": stats[5],
                "completed_count": stats[6],
                "cancelled_count": stats[7]
            }), 200
    return "查询失败", 500

@webLentV1.route('/searchLentByTimeRange/<start_date>/<end_date>', methods=['GET'])
def searchLentByTimeRange(start_date, end_date):
    sql = f"""
    SELECT ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price, lenter_name, status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days 
    FROM yyyp_lent 
    WHERE DATE(lean_start_time) >= '{start_date}' AND DATE(lean_start_time) <= '{end_date}'
    ORDER BY lean_start_time DESC;
    """
    result = Date_base().select(sql)
    if result and len(result) == 2:
        flag, data = result
        if flag:
            return jsonify(data), 200
    return "查询失败", 500