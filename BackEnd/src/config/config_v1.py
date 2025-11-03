from flask import jsonify, request, Blueprint
from src.log import Log
from src.execution_db import Date_base
from src.read_conf import read_conf
from src.db_manager.index.config import ConfigModel
import requests
import json


configV1 = Blueprint('configV1', __name__)

def get_database_name():
    conf = read_conf()
    return conf.get_database_name()


@configV1.route('/config_v1/<key1>/<key2>/<value>', methods=['post'])
def updata_config(key1, key2, value):
    database_name = get_database_name()
    sql = f"UPDATE config SET value = '{value}' WHERE key1 = '{key1}' AND key2 = '{key2}';"
    Date_base().update(sql)
    return '更新成功', 200

@configV1.route('/get_config/<key1>/<key2>', methods=['post'])
def get_yyyp_config(key1, key2):
    database_name = get_database_name()
    sql = f"SELECT value FROM config WHERE key1 = '{key1}' and key2 = '{key2}'"
    flag, data = Date_base().select(sql)
    return jsonify(data), 200

@configV1.route('/save', methods=['POST'])
def save_config():
    """保存或更新配置"""
    try:
        data = request.get_json()
        data_name = data.get('dataName')
        key1 = data.get('key1')
        key2 = data.get('key2')
        value = data.get('value')
        
        if not all([data_name, key1, key2, value]):
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            }), 400
        
        # 转义单引号，防止 SQL 错误
        data_name_escaped = data_name.replace("'", "''")
        key1_escaped = key1.replace("'", "''")
        key2_escaped = key2.replace("'", "''")
        value_escaped = value.replace("'", "''")
        
        # 检查是否存在同名配置
        sql = f"SELECT dataID, dataName, key1, key2, value FROM config WHERE dataName = '{data_name_escaped}' AND key1 = '{key1_escaped}' AND key2 = '{key2_escaped}'"
        flag, existing = Date_base().select(sql)
        
        if flag and existing and len(existing) > 0:
            # 更新现有配置，existing[0] 是元组，第一个字段是 dataID
            dataID = existing[0][0]
            Log().write_log(f"更新现有配置，dataID: {dataID}", 'info')
            update_sql = f"""
                UPDATE config 
                SET value = '{value_escaped}' 
                WHERE dataID = {dataID}
            """
            Date_base().update(update_sql)
        else:
            # 插入新配置
            insert_sql = f"""
                INSERT INTO config (dataName, key1, key2, value, status) 
                VALUES ('{data_name_escaped}', '{key1_escaped}', '{key2_escaped}', '{value_escaped}', '1')
            """
            Date_base().insert(insert_sql)
        
        return jsonify({
            'success': True,
            'message': '保存成功'
        }), 200
        
    except Exception as e:
        Log().write_log(f"保存配置失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'保存失败: {str(e)}'
        }), 500

@configV1.route('/list', methods=['GET'])
def list_configs():
    """获取配置列表"""
    try:
        key1 = request.args.get('key1')
        key2 = request.args.get('key2')
        
        # 构建WHERE条件
        where_conditions = []
        if key1:
            where_conditions.append(f"key1 = '{key1}'")
        if key2:
            where_conditions.append(f"key2 = '{key2}'")
        
        if not where_conditions:
            return jsonify({
                'success': False,
                'message': '至少需要提供 key1 或 key2 参数'
            }), 400
        
        where_clause = ' AND '.join(where_conditions)
        
        sql = f"""
            SELECT dataID, dataName, key1, key2, value, status, steamID, 
                   datetime('now') as updated_at
            FROM config 
            WHERE {where_clause}
            ORDER BY dataID DESC
        """
        flag, result = Date_base().select(sql)
        
        # 将元组列表转换为字典列表
        data = []
        if result:
            for row in result:
                data.append({
                    'id': row[0],           # dataID
                    'dataName': row[1],     # dataName
                    'key1': row[2],         # key1
                    'key2': row[3],         # key2
                    'value': row[4],        # value
                    'status': row[5],       # status
                    'steamID': row[6],      # steamID
                    'updated_at': row[7]    # updated_at
                })
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
        
    except Exception as e:
        Log().write_log(f"获取配置列表失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'获取失败: {str(e)}'
        }), 500

@configV1.route('/delete/<int:config_id>', methods=['DELETE'])
def delete_config(config_id):
    """删除配置"""
    try:
        sql = f"DELETE FROM config WHERE dataID = {config_id}"
        Date_base().delete(sql)
        
        return jsonify({
            'success': True,
            'message': '删除成功'
        }), 200
        
    except Exception as e:
        Log().write_log(f"删除配置失败: {str(e)}", 'error')
        return jsonify({
            'success': False,
            'message': f'删除失败: {str(e)}'
        }), 500
