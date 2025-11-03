from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
import requests


CSDB_blueprint = Blueprint('CSDB_api', __name__)

def get_database_name():
    db_instance = Date_base()
    return db_instance.get_database_name()

class CSDB:
    @CSDB_blueprint.route('/updata_config/<key1>/<key2>/<value>', methods=['post'])
    def updata_config(key1, key2, value):
        database_name = get_database_name()
        sql = f"UPDATE config SET value = '{value}' WHERE key1 = '{key1}' AND key2 = '{key2}';"
        Date_base().update(sql)
        return '更新成功', 200

    @CSDB_blueprint.route('/get_config/<key1>/<key2>', methods=['post'])
    def get_yyyp_config(key1, key2):
        database_name = get_database_name()
        sql = f"SELECT value FROM config WHERE key1 = '{key1}' and key2 = '{key2}'"
        flag, data = Date_base().select(sql)
        return jsonify(data), 200

    @CSDB_blueprint.route('/get_buy_data/<int:limit>/<int:max_limit>', methods=['post'])
    def get_buy_data(limit, max_limit):
        database_name = get_database_name()
        sql = f"SELECT weapon_name, weapon_type, item_name, weapon_float, float_range, price, \\\"from\\\", order_time, status FROM buy where \\\"from\\\" = 'yyyp' limit {max_limit} offset {limit}"
        flag, data = Date_base().select(sql)
        return jsonify(data), 200
    
    @CSDB_blueprint.route('/get_sell_data/<int:limit>/<int:max_limit>', methods=['post'])
    def get_sell_data(limit, max_limit):
        database_name = get_database_name()
        sql = f"SELECT weapon_name, weapon_type, item_name, weapon_float, float_range, price, \\\"from\\\", order_time FROM sell where \\\"from\\\" = 'yyyp' limit {max_limit} offset {limit}"
        flag, data = Date_base().select(sql)
        return jsonify(data), 200


    @CSDB_blueprint.route('/insert_webside_buydata', methods=['post'])
    def insert_webside_buydata():
        data = request.get_json()
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        seller_name = data['seller_name']
        order_time = data['order_time']
        status = data['status']
        data_from = data['from']
        storage_time = data['storage_time']
        steamid = data['steam_id']
        try:
            buy_number = int(data['buy_number'])
        except TypeError:
            buy_number = "None"
        try:
            err_number = int(data['err_number'])
        except TypeError:
            err_number = "None"
        price_all = data['price_all']
        payment = data['payment']

        database_name = get_database_name()
        sql = (f"INSERT INTO {data_from}_buy "
                f"(ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,"
                f" seller_name, order_time, status, \"from\", storage_time, steam_id,"
                f" buy_number, err_number, price_all, payment)"
                f" VALUES "
                f"('{ID}','{weapon_name}','{weapon_type}','{item_name}',{weapon_float},'{float_range}',{price},"
                f" '{seller_name}', '{order_time}', '{status}', '{data_from}', '{storage_time}', '{steamid}',"
                f" '{buy_number}', '{err_number}', {price_all}, '{payment}' );")
        a_status = Date_base().insert(sql)
        
        if buy_number == 1 :
            database_name = get_database_name()
            sql = (f"INSERT INTO buy "
            f"(ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,"
            f" seller_name, status, \"from\", storage_time, steam_id )"
            f" VALUES "
            f"('{ID}','{weapon_name}','{weapon_type}','{item_name}',{weapon_float},'{float_range}',{price},"
            f" '{seller_name}',  '{status}', '{data_from}', '{storage_time}', '{steamid}');")
            Date_base().insert(sql)
            
        if a_status == '重复数据':
            insert_status = "重复数据"
        elif a_status:
            insert_status = '写入成功'
        else:
            insert_status = '写入失败'
        return insert_status, 200

    @CSDB_blueprint.route('/insert_main_buydata', methods=['post'])
    def insert_main_buydata():
        data = request.get_json()
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        seller_name = data['seller_name']
        order_time = data['order_time']
        status = data['status']
        data_from = data['from']
        storage_time = data['storage_time']
        steamid = data['steam_id']
        try:
            buy_number = int(data['buy_number'])
        except TypeError:
            buy_number = "None"
        try:
            err_number = int(data['err_number'])
        except TypeError:
            err_number = "None"

        price_all = data['price_all']

        database_name = get_database_name()
        sql = (f"INSERT INTO buy "
            f"(ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,"
            f" seller_name, order_time, status, \"from\", storage_time, steam_id )"
            f" VALUES "
            f"('{ID}','{weapon_name}','{weapon_type}','{item_name}',{weapon_float},'{float_range}',{price},"
            f" '{seller_name}', '{order_time}', '{status}', '{data_from}', '{storage_time}', '{steamid}');")
        a_status = Date_base().insert(sql)
        
        if a_status is True:
            insert_status = "写入成功"
        elif a_status == '重复数据':
            insert_status = '重复数据'
        else:
            insert_status = '写入失败'
        return insert_status, 200

    
    @CSDB_blueprint.route('/insert_webside_selldata', methods=['post'])
    def insert_webside_selldata():
        data = request.get_json()
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        buyer_user_name = data['buyer_user_name']
        order_time = data['order_time']
        status = data['status']
        data_from = data['from']
        storage_time = data['storage_time']
        steamid = data['steam_id']
        try:
            sell_number = int(data['sell_number'])
        except TypeError:
            sell_number = "None"
        try:
            err_number = int(data['err_number'])
        except TypeError:
            err_number = "None"

        price_all = data['price_all']

        database_name = get_database_name()
        sql =  (f"INSERT INTO {data_from}_sell "
                f"(ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,"
                f" buyer_name, order_time, status, \"from\", storage_time, steam_id,"
                f" sell_number, err_number, price_all)"
                f" VALUES "
                f"('{ID}','{weapon_name}','{weapon_type}','{item_name}',{weapon_float},'{float_range}',{price},"
                f" '{buyer_user_name}', '{storage_time}', '{status}', '{data_from}', '{order_time}', '{steamid}',"
                f" '{sell_number}', '{err_number}', {price_all});")
        a_status = Date_base().insert(sql)

        if sell_number == 1:
            database_name = get_database_name()
            sql =  (f"INSERT INTO sell "
                    f"(ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,"
                    f" buyer_name, order_time, status, \"from\", storage_time, steam_id,"
                    f" sell_number, err_number, price_all)"
                    f" VALUES "
                    f"('{ID}','{weapon_name}','{weapon_type}','{item_name}',{weapon_float},'{float_range}',{price},"
                    f" '{buyer_user_name}', '{storage_time}', '{status}', '{data_from}', '{order_time}', '{steamid}',"
                    f" '{sell_number}', '{err_number}', {price_all});")
            Date_base().insert(sql)
            
        if a_status == '重复数据':
            insert_status = "重复数据"
        elif a_status:
            insert_status = '写入成功'
        else:
            insert_status = '写入失败'
        return insert_status, 200

    @CSDB_blueprint.route('/insert_main_selldata', methods=['post'])
    def insert_main_selldata():
        data = request.get_json()
        ID = data['ID']
        weapon_name = data['weapon_name']
        weapon_type = data['weapon_type']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        buyer_user_name = data['buyer_user_name']
        order_time = data['order_time']
        status = data['status']
        data_from = data['from']
        storage_time = data['storage_time']
        steamid = data['steam_id']
        try:
            sell_number = int(data['sell_number'])
        except TypeError:
            sell_number = "None"
        try:
            err_number = int(data['err_number'])
        except TypeError:
            err_number = "None"
        price_all = data['price_all']

        database_name = get_database_name()
        sql =  (f"INSERT INTO sell "
            f"(ID, weapon_name, weapon_type, item_name, weapon_float, float_range, price,"
            f" buyer_name, order_time, status, \"from\", storage_time, steam_id,"
            f" sell_number, err_number, price_all)"
            f" VALUES "
            f"('{ID}','{weapon_name}','{weapon_type}','{item_name}',{weapon_float},'{float_range}',{price},"
            f" '{buyer_user_name}', '{storage_time}', '{status}', '{data_from}', '{order_time}', '{steamid}',"
            f" '{sell_number}', '{err_number}', {price_all});")
        a_status = Date_base().insert(sql)
        
        if a_status is True:
            insert_status = "写入成功"
        elif a_status == '重复数据':
            insert_status = '重复数据'
        else:
            insert_status = '写入失败'
        return insert_status, 200

    @CSDB_blueprint.route('/insert_webside_lentdata', methods=['post'])
    def insert_webside_lentdata():
        data = request.get_json()
        ID = data['ID']
        weapon_name = data['weapon_name']
        item_name = data['item_name']
        weapon_float = data['weapon_float']
        float_range = data['float_range']
        price = data['price']
        lent_user_name = data['buyer_user_name']
        status = data['status']
        orderSubStatusName = data['orderSubStatusName']
        data_from = data['from']
        lean_start_time = data['lean_start_time']
        lean_end_time = data['lean_end_time']
        totalLeaseDays = int(data['totalLeaseDays'])
        max_Lease_Days = int(data['leaseMaxDays'])
        database_name = get_database_name()
        sql = (f"INSERT INTO yyyp_lent (ID, weapon_name, item_name, weapon_float, float_range, price, lenter_name, "
                f"status, last_status, \"from\", lean_start_time, lean_end_time, total_Lease_Days, max_Lease_Days) "
                f"VALUES ('{ID}', '{weapon_name}', '{item_name}', {weapon_float}, '{float_range}', {price}, '{lent_user_name}',"
                f"'{status}', '{orderSubStatusName}', '{data_from}', '{lean_start_time}', '{lean_end_time}', {totalLeaseDays}, {max_Lease_Days});")
        a_status = Date_base().insert(sql)
        
        if a_status is True:
            insert_status = "写入成功"
        elif a_status == '重复数据':
            insert_status = '重复数据'
        else:
            insert_status = '写入失败'
        return insert_status, 200
        
    @CSDB_blueprint.route('/insert_message_box_data', methods=['post'])
    def insert_message_box_data():
        data = request.get_json()
        message_id = data['message_id']
        title = data['title']
        templateCode = data['templateCode']
        imageType = data['imageType']
        readStatus = data['readStatus']
        message_type = data['message_type']
        orderNo = data['orderNo']
        showStyle = data['showStyle']
        sentName = data['sentName']
        createTime = data['createTime']
        message_text = data['message_text']
        data_from = data['data_from']

        database_name = get_database_name()
        sql = (f"INSERT INTO {data_from}_messagebox (message_id, title, templateCode, imageType, readStatus, message_type, orderNo,"
            f"showStyle, sentName, createTime, message_text) VALUES "
            f"('{message_id}', '{title}', '{templateCode}', {imageType}, {readStatus}, {message_type}, '{orderNo}', {showStyle}, '{sentName}', '{createTime}', '{message_text}');")
        
        a_status = Date_base().insert(sql)
        
        if a_status is True:
            insert_status = "写入成功"
        elif a_status == '重复数据':
            insert_status = '重复数据'
        else:
            insert_status = '写入失败'
        return insert_status, 200