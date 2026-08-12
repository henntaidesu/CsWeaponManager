"""
Steam select_weapon 处理模块
提供 Spider 所需的 Steam Hash Name 批量写入接口
"""
from flask import jsonify, request
from src.db_manager.index.model.weapon_classID import WeaponClassIDModel


class SelectWeaponHandler:

    @staticmethod
    def batch_insert_steam_hash_name():
        """批量插入或更新 Steam Hash Name 数据（仅当不存在时插入）"""
        try:
            data = request.get_json()
            if not data or 'weapons' not in data:
                return jsonify({'success': False, 'error': '请求数据格式错误，需要weapons字段'}), 400

            weapons = data['weapons']
            if not isinstance(weapons, list):
                return jsonify({'success': False, 'error': 'weapons字段必须是数组'}), 400
            if len(weapons) == 0:
                return jsonify({'success': False, 'error': 'weapons数组不能为空'}), 400

            success_count = WeaponClassIDModel.batch_insert_steam_hash_name_if_not_exists(weapons)
            return jsonify({'success': True, 'message': f'成功处理 {success_count} 条数据', 'success_count': success_count, 'total_count': len(weapons)}), 200
        except Exception as e:
            print(f"批量插入Steam Hash Name失败: {e}")
            import traceback
            print(f"错误堆栈: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def batch_upsert_steam_mapping():
        """批量写入 Steam 饰品映射ID（classid/instanceid），已存在的记录只补齐空字段"""
        try:
            data = request.get_json()
            if not data or 'weapons' not in data:
                return jsonify({'success': False, 'error': '请求数据格式错误，需要weapons字段'}), 400

            weapons = data['weapons']
            if not isinstance(weapons, list):
                return jsonify({'success': False, 'error': 'weapons字段必须是数组'}), 400
            if len(weapons) == 0:
                return jsonify({'success': False, 'error': 'weapons数组不能为空'}), 400

            success_count = WeaponClassIDModel.batch_upsert_steam_mapping(weapons)
            return jsonify({'success': True, 'message': f'成功处理 {success_count} 条数据', 'success_count': success_count, 'total_count': len(weapons)}), 200
        except Exception as e:
            print(f"批量写入Steam映射ID失败: {e}")
            import traceback
            print(f"错误堆栈: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500
