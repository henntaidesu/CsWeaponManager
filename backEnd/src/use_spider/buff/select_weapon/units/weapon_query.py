"""
BUFF select_weapon 查询模块
提供 Spider 所需的 buff_id（BUFF 商品ID / goods_id）反查接口
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager


class WeaponQuery:

    @staticmethod
    def get_buff_id_by_hash_name():
        """
        按 steam_hash_name 批量反查 buff_id

        BUFF 上架预览接口需要 goods_id，而创建接口不需要。库存里只有
        steam_hash_name，映射关系存在 weapon_classID 表的 buff_id 列。

        请求: {"steamHashNames": ["AK-47 | Redline (Field-Tested)", ...]}
        返回: {"success": true, "data": {"<hash_name>": <buff_id>, ...}}
             查不到的 hash_name 不会出现在 data 里，由调用方决定如何处理
        """
        try:
            data = request.get_json() or {}
            hash_names = data.get('steamHashNames')

            # 兼容单个查询
            if not hash_names:
                single = data.get('steamHashName')
                hash_names = [single] if single else []

            hash_names = [str(n).strip() for n in hash_names if str(n or '').strip()]
            if not hash_names:
                return jsonify({'success': False, 'message': '缺少必要参数: steamHashNames'}), 400

            db = DatabaseManager()
            placeholders = ','.join(['?'] * len(hash_names))
            sql = f"""
            SELECT steam_hash_name, buff_id
            FROM weapon_classID
            WHERE steam_hash_name IN ({placeholders}) AND buff_id IS NOT NULL
            """
            rows = db.execute_query(sql, tuple(hash_names))

            mapping = {}
            for row in rows or []:
                if row[0] and row[1]:
                    mapping[row[0]] = row[1]

            missing = [n for n in hash_names if n not in mapping]

            return jsonify({
                'success': True,
                'data': mapping,
                'missing': missing
            }), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'查询buff_id失败: {str(e)}'}), 500
