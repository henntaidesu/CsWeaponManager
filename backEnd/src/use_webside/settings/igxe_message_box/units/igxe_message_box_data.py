"""
IgxeMessageBox Data 模块
提供 IGXE 消息盒子的数据查询端点
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager


class IgxeMessageBoxData:

    @staticmethod
    def get_message_data(page, limit):
        """获取消息列表数据（分页）

        可选查询参数:
          category  按分类过滤（-1 为系统公告）
          data_user 按账号过滤
        """
        try:
            db = DatabaseManager()
            offset = (page - 1) * limit

            conditions = []
            params = []

            category = request.args.get('category')
            if category not in (None, '', 'all'):
                try:
                    conditions.append("category = ?")
                    params.append(int(category))
                except ValueError:
                    pass

            data_user = request.args.get('data_user')
            if data_user:
                conditions.append("data_user = ?")
                params.append(data_user)

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            result_count = db.execute_query(
                f"SELECT COUNT(*) FROM igxe_messagebox {where}", tuple(params)
            )
            total = result_count[0][0] if result_count else 0

            sql = f"""
            SELECT
                message_id,
                category,
                title,
                content,
                biz_id,
                biz_type,
                product_id,
                app_id,
                url,
                is_read,
                createTime,
                data_user
            FROM igxe_messagebox
            {where}
            ORDER BY createTime DESC
            LIMIT ? OFFSET ?
            """
            result = db.execute_query(sql, tuple(params) + (limit, offset))

            data = []
            if result:
                for r in result:
                    data.append({
                        'message_id': r[0],
                        'category': r[1],
                        'title': r[2],
                        'content': r[3],
                        'biz_id': r[4],
                        'biz_type': r[5],
                        'product_id': r[6],
                        'app_id': r[7],
                        'url': r[8],
                        'is_read': r[9],
                        'createTime': r[10],
                        'data_user': r[11],
                    })

            return jsonify({'success': True, 'data': data, 'total': total}), 200

        except Exception as e:
            return jsonify({'success': False, 'error': f'查询失败: {str(e)}', 'data': [], 'total': 0}), 500

    @staticmethod
    def get_message_categories():
        """获取所有出现过的消息分类"""
        try:
            db = DatabaseManager()
            result = db.execute_query(
                "SELECT DISTINCT category FROM igxe_messagebox "
                "WHERE category IS NOT NULL ORDER BY category", ()
            )

            categories = [r[0] for r in result] if result else []
            return jsonify({'success': True, 'data': categories}), 200

        except Exception as e:
            return jsonify({'success': False, 'error': f'查询失败: {str(e)}', 'data': []}), 500
