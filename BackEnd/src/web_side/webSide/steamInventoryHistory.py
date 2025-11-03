from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.db_manager.steam.steam_inventory_history import SteamInventoryHistoryModel
import traceback

webSteamInventoryHistoryV1 = Blueprint('webSteamInventoryHistoryV1', __name__)

# ==================== Helper Functions ====================

def calculate_stats(records):
    """计算统计数据"""
    if not records:
        return {
            "total_count": 0,
            "gain_count": 0,
            "loss_count": 0
        }
    
    total_count = len(records)
    gain_count = sum(1 for record in records if record.trade_type == '+')
    loss_count = sum(1 for record in records if record.trade_type == '-')
    
    return {
        "total_count": total_count,
        "gain_count": gain_count,
        "loss_count": loss_count
    }

def record_to_dict(record):
    """将记录转换为字典格式"""
    return {
        "instanceid": record.instanceid,
        "classid": record.classid,
        "ID": record.ID,
        "order_time": record.order_time,
        "trade_title": record.trade_title,
        "appid": record.appid,
        "item_name": record.item_name,
        "weapon_name": record.weapon_name,
        "weapon_type": record.weapon_type,
        "float_range": record.float_range,
        "trade_type": record.trade_type
    }

# ==================== Steam Inventory History APIs ====================

@webSteamInventoryHistoryV1.route('/count', methods=['GET'])
def count():
    """获取Steam交易历史记录总数"""
    try:
        count = SteamInventoryHistoryModel.count()
        return jsonify({"count": count}), 200
    except Exception as e:
        print(f"查询Steam交易历史总数失败: {e}")
        return jsonify({"count": 0}), 500

@webSteamInventoryHistoryV1.route('/list', methods=['GET'])
def get_list():
    """获取Steam交易历史记录列表（分页、筛选、搜索）- 优化版"""
    try:
        # 获取查询参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        trade_type = request.args.get('trade_type', None)
        search = request.args.get('search', None)
        start_date = request.args.get('start_date', None)
        end_date = request.args.get('end_date', None)
        sort_field = request.args.get('sort_field', 'order_time')
        sort_order = request.args.get('sort_order', 'desc')
        need_stats = request.args.get('need_stats', 'true').lower() == 'true'
        
        # 构建查询条件
        where_conditions = []
        params = []
        
        # 交易类型筛选
        if trade_type and trade_type in ['+', '-']:
            where_conditions.append("trade_type = ?")
            params.append(trade_type)
        
        # 搜索条件（交易标题、物品名、武器名）
        if search:
            where_conditions.append("(trade_title LIKE ? OR item_name LIKE ? OR weapon_name LIKE ?)")
            params.append(f"%{search}%")
            params.append(f"%{search}%")
            params.append(f"%{search}%")
        
        # 时间范围筛选
        if start_date and end_date:
            where_conditions.append("DATE(order_time) BETWEEN ? AND ?")
            params.append(start_date)
            params.append(end_date)
        
        # 组合WHERE子句
        if where_conditions:
            where_clause = " AND ".join(where_conditions)
        else:
            where_clause = "1=1"
        
        # 添加排序
        sort_direction = "DESC" if sort_order.lower() == 'desc' else "ASC"
        where_clause_with_order = where_clause + f" ORDER BY {sort_field} {sort_direction}"
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 查询数据（主查询）
        records = SteamInventoryHistoryModel.find_all(
            where_clause_with_order,
            tuple(params),
            limit=page_size,
            offset=offset
        )
        
        # 查询总数（使用 COUNT 查询，不获取所有数据）
        total_count = SteamInventoryHistoryModel.count(where_clause, tuple(params))
        
        # 转换为字典格式（优化：直接构建字典而不是调用函数）
        data = []
        for record in records:
            data.append({
                "instanceid": record.instanceid,
                "classid": record.classid,
                "ID": record.ID,
                "order_time": record.order_time,
                "trade_title": record.trade_title,
                "appid": record.appid,
                "item_name": record.item_name,
                "weapon_name": record.weapon_name,
                "weapon_type": record.weapon_type,
                "float_range": record.float_range,
                "trade_type": record.trade_type
            })
        
        # 统计信息（优化：仅在需要时查询）
        gain_count = 0
        loss_count = 0
        
        if need_stats:
            # 使用 SQL COUNT 查询代替获取所有数据
            gain_where = where_clause + " AND trade_type = '+'"
            loss_where = where_clause + " AND trade_type = '-'"
            
            gain_params = list(params) + ['+'] if params else ['+']
            loss_params = list(params) + ['-'] if params else ['-']
            
            gain_count = SteamInventoryHistoryModel.count(gain_where, tuple(gain_params))
            loss_count = SteamInventoryHistoryModel.count(loss_where, tuple(loss_params))
        
        return jsonify({
            "success": True,
            "data": {
                "records": data,
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "gain_count": gain_count,
                "loss_count": loss_count
            }
        }), 200
        
    except Exception as e:
        print(f"查询Steam交易历史列表失败: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {
                "records": [],
                "total": 0,
                "page": 1,
                "page_size": 20,
                "gain_count": 0,
                "loss_count": 0
            }
        }), 500

@webSteamInventoryHistoryV1.route('/detail/<instanceid>/<classid>', methods=['GET'])
def get_detail(instanceid, classid):
    """获取Steam交易历史记录详情"""
    try:
        # 使用 instanceid 和 classid 组合查找
        records = SteamInventoryHistoryModel.find_all(
            "instanceid = ? AND classid = ?",
            (instanceid, classid),
            limit=1
        )
        
        if records and len(records) > 0:
            return jsonify({
                "success": True,
                "data": record_to_dict(records[0])
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "记录不存在"
            }), 404
            
    except Exception as e:
        print(f"查询Steam交易历史详情失败: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@webSteamInventoryHistoryV1.route('/stats', methods=['GET'])
def get_stats():
    """获取Steam交易历史统计数据"""
    try:
        # 获取所有记录
        all_records = SteamInventoryHistoryModel.find_all()
        stats = calculate_stats(all_records)
        
        return jsonify({
            "success": True,
            "data": stats
        }), 200
        
    except Exception as e:
        print(f"获取Steam交易历史统计失败: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {
                "total_count": 0,
                "gain_count": 0,
                "loss_count": 0
            }
        }), 500

@webSteamInventoryHistoryV1.route('/search', methods=['GET'])
def search():
    """搜索Steam交易历史记录"""
    try:
        keyword = request.args.get('keyword', '')
        
        if not keyword:
            return jsonify({
                "success": False,
                "error": "搜索关键词不能为空"
            }), 400
        
        # 搜索交易标题、物品名、武器名
        records = SteamInventoryHistoryModel.find_all(
            "trade_title LIKE ? OR item_name LIKE ? OR weapon_name LIKE ? ORDER BY order_time DESC",
            (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%")
        )
        
        data = [record_to_dict(record) for record in records]
        
        return jsonify({
            "success": True,
            "data": {
                "records": data,
                "total": len(data)
            }
        }), 200
        
    except Exception as e:
        print(f"搜索Steam交易历史失败: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {
                "records": [],
                "total": 0
            }
        }), 500

@webSteamInventoryHistoryV1.route('/byTradeType/<trade_type>', methods=['GET'])
def get_by_trade_type(trade_type):
    """根据交易类型获取记录"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        if trade_type not in ['+', '-']:
            return jsonify({
                "success": False,
                "error": "无效的交易类型"
            }), 400
        
        records = SteamInventoryHistoryModel.find_all(
            "trade_type = ? ORDER BY order_time DESC",
            (trade_type,),
            limit=page_size,
            offset=offset
        )
        
        total = SteamInventoryHistoryModel.count("trade_type = ?", (trade_type,))
        
        data = [record_to_dict(record) for record in records]
        
        return jsonify({
            "success": True,
            "data": {
                "records": data,
                "total": total,
                "page": page,
                "page_size": page_size
            }
        }), 200
        
    except Exception as e:
        print(f"根据交易类型查询失败: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {
                "records": [],
                "total": 0
            }
        }), 500

@webSteamInventoryHistoryV1.route('/byTimeRange', methods=['GET'])
def get_by_time_range():
    """根据时间范围获取记录"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 20))
        offset = (page - 1) * page_size
        
        if not start_date or not end_date:
            return jsonify({
                "success": False,
                "error": "开始日期和结束日期不能为空"
            }), 400
        
        records = SteamInventoryHistoryModel.find_all(
            "DATE(order_time) BETWEEN ? AND ? ORDER BY order_time DESC",
            (start_date, end_date),
            limit=page_size,
            offset=offset
        )
        
        total = SteamInventoryHistoryModel.count(
            "DATE(order_time) BETWEEN ? AND ?",
            (start_date, end_date)
        )
        
        data = [record_to_dict(record) for record in records]
        
        return jsonify({
            "success": True,
            "data": {
                "records": data,
                "total": total,
                "page": page,
                "page_size": page_size
            }
        }), 200
        
    except Exception as e:
        print(f"根据时间范围查询失败: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {
                "records": [],
                "total": 0
            }
        }), 500

