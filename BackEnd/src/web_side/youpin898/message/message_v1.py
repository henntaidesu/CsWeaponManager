from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
import requests

youpin898MessageBoxV1 = Blueprint('youpin898MessageBoxV1', __name__)

def get_database_name():
    db_instance = Date_base()
    return db_instance.get_database_name()


@youpin898MessageBoxV1.route('/insert_message_box_data', methods=['post'])
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
    sql = (f"INSERT INTO {data_from}_messagebox (message_id, title, templateCode, imageType, readStatus, message_type, orderNo, "
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