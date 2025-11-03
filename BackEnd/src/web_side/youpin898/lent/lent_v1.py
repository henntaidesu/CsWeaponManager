from flask import jsonify, request, Blueprint
from src.log import Log
from src.now_time import today
from src.db_manager.yyyp.yyyp_lent import YyypLentModel
import requests

youpin898LentV1 = Blueprint('youpin898LentV1', __name__)

@youpin898LentV1.route('/getNowLentingList', methods=['get'])
def getNowLentingList():
    """获取当前需要更新状态的租赁订单列表（未完成且已到达或超过结束时间的订单）"""
    try:
        # 查询所有未完成、有结束时间且已到达结束时间的订单
        current_time = today()
        records = YyypLentModel.find_all(
            where="status NOT IN ('完成') AND lean_end_time IS NOT NULL AND lean_end_time <= ?",
            params=(current_time,)
        )
        data = [[record.ID] for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询租借列表失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500  

@youpin898LentV1.route('/getTimeOutLent', methods=['get'])
def getTimeOutLent():
    """获取超时的租赁订单"""
    try:
        # 使用模型查询超时订单
        records = YyypLentModel.find_all(
            where="lean_end_time < ? AND status IN ('白玩中', '归还中', '租赁中')",
            params=(today(),)
        )
        # 返回ID列表，格式与原来保持一致
        data = [[record.ID] for record in records]
        return jsonify(data), 200
    except Exception as e:
        print(f"查询超时租赁订单失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500

@youpin898LentV1.route('/selectApexTime/<steamId>', methods=['get'])
def selectApexTime(steamId):
    """
    获取指定steamId的最新租赁订单时间
    用于判断是否有新数据需要同步
    """
    try:
        # 直接使用 SQL 查询，按 lean_start_time 降序排列，取第一条
        from src.db_manager.database import DatabaseManager
        db = DatabaseManager()
        
        sql = """
            SELECT lean_start_time 
            FROM yyyp_lent 
            WHERE data_user = ? 
            ORDER BY lean_start_time DESC 
            LIMIT 1
        """
        
        result = db.execute_query(sql, (steamId,))
        
        if result and len(result) > 0:
            apex_time = result[0][0]
            return jsonify(apex_time), 200
        else:
            # 如果没有数据，返回一个很早的时间
            return jsonify('2000-01-01 00:00:00'), 200
    except Exception as e:
        print(f"查询最新租赁时间失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify('2000-01-01 00:00:00'), 500

@youpin898LentV1.route('/getCount/<steamId>', methods=['get'])
def getCount(steamId):
    """
    获取指定steamId的租赁订单总数
    用于分页获取历史数据
    """
    try:
        # 使用模型的 count 方法
        count = YyypLentModel.count(
            where="data_user = ?",
            params=(steamId,)
        )
        return jsonify(count), 200
    except Exception as e:
        print(f"查询租赁订单数量失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(0), 500

@youpin898LentV1.route('/updateLentData', methods=['post'])
def updateLentData():
    """更新租赁订单状态"""
    try:
        data = request.get_json()
        ID = data['ID']
        status = data['status']  # orderStatusName -> status
        status_sub = data.get('status_sub', '')  # orderStatusDesc -> status_sub
        orderSubStatusName = data['orderSubStatusName']  # orderSubStatusName -> last_status
        lean_end_time = data['lean_end_time']
        totalLeaseDays = data['totalLeaseDays']
        leaseMaxDays = data.get('leaseMaxDays')  # 可选字段
        
        # 查找现有记录
        lent_record = YyypLentModel.find_by_id(ID=ID)
        if not lent_record:
            return 'update_error', 404
        
        # 更新字段
        lent_record.status = status  # orderStatusName
        lent_record.status_sub = status_sub  # orderStatusDesc
        lent_record.last_status = orderSubStatusName  # orderSubStatusName
        lent_record.lean_end_time = lean_end_time
        lent_record.total_Lease_Days = totalLeaseDays
        
        # 如果提供了 leaseMaxDays，则更新
        if leaseMaxDays is not None:
            lent_record.max_Lease_Days = leaseMaxDays
        
        # 保存更新
        if lent_record.save():
            return 'update_info', 200
        else:
            return 'update_error', 500
            
    except Exception as e:
        print(f"更新租赁数据失败: {e}")
        import traceback
        traceback.print_exc()
        return 'update_error', 500


@youpin898LentV1.route('/insert_webside_lentdata', methods=['post'])
def insert_webside_lentdata():
    """插入租赁订单数据"""
    try:
        data = request.get_json()
        
        # 提取数据
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data.get('weapon_float')
        float_range = data['float_range']
        price = data['price']
        lent_user_name = data['buyer_user_name']
        lenter_id = data.get('lenter_id', '')  # 租客ID
        status = data['status']
        orderSubStatusName = data['orderSubStatusName']
        status_sub = data.get('status_sub', '')  # 订单状态描述
        data_from = data['from']
        lean_start_time = data['lean_start_time']
        lean_end_time = data.get('lean_end_time')
        totalLeaseDays = int(data['totalLeaseDays'])
        # leaseMaxDays 字段可选，如果没有提供则使用 totalLeaseDays 作为默认值
        max_Lease_Days = int(data.get('leaseMaxDays', totalLeaseDays))
        data_user = data.get('data_user', '')
        
        # 检查记录是否已存在
        existing_record = YyypLentModel.find_by_id(ID=ID)
        if existing_record:
            return '重复数据', 200
        
        # 使用模型创建新记录
        lent_record = YyypLentModel(
            ID=ID,
            weapon_name=weapon_name,
            weapon_type=weapon_type,
            item_name=item_name,
            weapon_float=weapon_float,
            float_range=float_range,
            price=price,
            lenter_name=lent_user_name,
            lenter_id=lenter_id,
            status=status,
            status_sub=status_sub,
            last_status=orderSubStatusName,
            **{'from': data_from},  # 'from' 是保留字，需要用字典解包
            lean_start_time=lean_start_time,
            lean_end_time=lean_end_time,
            total_Lease_Days=totalLeaseDays,
            max_Lease_Days=max_Lease_Days,
            data_user=data_user
        )
        
        # 保存到数据库
        if lent_record.save():
            return '写入成功', 200
        else:
            return '写入失败', 500
            
    except Exception as e:
        print(f"插入租赁数据失败: {e}")
        import traceback
        traceback.print_exc()
        return '写入失败', 500
