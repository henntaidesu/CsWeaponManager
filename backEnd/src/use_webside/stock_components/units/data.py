"""
StockComponents 页面库存数据模块
提供组件库存下拉列表、组件明细列表、分组列表查询
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager


def safe_float(value, default=0.0):
    """安全的浮点数转换"""
    if value is None or value == '':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _build_filter_conditions(steam_id):
    """构建通用的筛选条件（8 种筛选）"""
    where_conditions = ["data_user = ?"]
    params = [steam_id]

    search_text = request.args.get('search', '')
    weapon_type = request.args.get('weapon_type', '')
    float_range = request.args.get('float_range', '')
    weapon_level = request.args.get('weapon_level', '')
    assetid = request.args.get('assetid', '')
    pendant_filter = request.args.get('pendant_filter', '')
    sticker_filter = request.args.get('sticker_filter', '')
    rename_filter = request.args.get('rename_filter', '')

    if assetid:
        where_conditions.append("assetid = ?")
        params.append(assetid)

    if search_text:
        where_conditions.append("(weapon_name LIKE ? OR item_name LIKE ?)")
        params.append(f"%{search_text}%")
        params.append(f"%{search_text}%")

    if weapon_type:
        where_conditions.append("weapon_type = ?")
        params.append(weapon_type)

    if float_range:
        where_conditions.append("float_range = ?")
        params.append(float_range)

    if weapon_level:
        where_conditions.append("weapon_level = ?")
        params.append(weapon_level)

    if pendant_filter == 'has':
        where_conditions.append("(pendant IS NOT NULL AND pendant != '' AND pendant != 'None' AND pendant != '[]')")
    elif pendant_filter == 'none':
        where_conditions.append("(pendant IS NULL OR pendant = '' OR pendant = 'None' OR pendant = '[]')")

    if sticker_filter == 'has':
        where_conditions.append("(sticker IS NOT NULL AND sticker != '' AND sticker != 'None' AND sticker != '[]')")
    elif sticker_filter == 'none':
        where_conditions.append("(sticker IS NULL OR sticker = '' OR sticker = 'None' OR sticker = '[]')")

    if rename_filter == 'has':
        where_conditions.append("(rename IS NOT NULL AND rename != '' AND rename != 'None')")
    elif rename_filter == 'none':
        where_conditions.append("(rename IS NULL OR rename = '' OR rename = 'None')")

    where_clause = " AND ".join(where_conditions)
    return where_clause, params


class StockComponentsData:

    @staticmethod
    def get_component_inventory(steam_id):
        """
        从 steam_inventory 表获取库存组件列表（用于下拉框选择）
        支持 classid 和 limit/offset 参数
        """
        try:
            classid = request.args.get('classid', '')
            limit = request.args.get('limit', 9999, type=int)
            offset = request.args.get('offset', 0, type=int)

            db = DatabaseManager()

            where_conditions = ["data_user = ?", "if_inventory = '1'"]
            params = [steam_id]

            if classid:
                where_conditions.append("classid = ?")
                params.append(classid)

            where_clause = " AND ".join(where_conditions)

            sql = f"""
            SELECT
                assetid, instanceid, classid, item_name, weapon_name, float_range,
                weapon_type, weapon_float, remark, data_user, buy_price, yyyp_price,
                buff_price, steam_price, order_time, steam_hash_name, sticker, pendant, rename
            FROM steam_inventory
            WHERE {where_clause}
            ORDER BY
                CASE
                    WHEN weapon_type = '未知物品' THEN 1
                    ELSE 0
                END,
                CAST(buy_price AS REAL) DESC,
                assetid
            LIMIT ? OFFSET ?
            """
            params.extend([limit, offset])
            results = db.execute_query(sql, tuple(params))

            records = []
            if results:
                for row in results:
                    # 如果是库存组件，查询实际数量
                    actual_count = None
                    if row[2] == '3604678661':
                        try:
                            count_sql = """
                            SELECT COUNT(*) FROM steam_stockComponents
                            WHERE assetid = ? AND data_user = ?
                            """
                            count_result = db.execute_query(count_sql, (row[0], steam_id))
                            actual_count = count_result[0][0] if count_result else 0
                        except Exception:
                            actual_count = 0

                    record = {
                        'assetid': row[0],
                        'instanceid': row[1],
                        'classid': row[2],
                        'item_name': row[3],
                        'weapon_name': row[4],
                        'float_range': row[5],
                        'weapon_type': row[6],
                        'weapon_float': row[7],
                        'remark': row[8],
                        'data_user': row[9],
                        'buy_price': row[10],
                        'yyyp_price': row[11],
                        'buff_price': row[12],
                        'steam_price': row[13],
                        'order_time': row[14],
                        'steam_hash_name': row[15],
                        'sticker': row[16],
                        'pendant': row[17],
                        'rename': row[18],
                        'actual_count': actual_count
                    }
                    records.append(record)

            # 获取总数
            count_params = params[:-2]
            count_sql = f"SELECT COUNT(*) FROM steam_inventory WHERE {where_clause}"
            count_result = db.execute_query(count_sql, tuple(count_params))
            total = count_result[0][0] if count_result else 0

            return jsonify({
                'success': True,
                'data': records,
                'total': total
            }), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'查询失败: {str(e)}'
            }), 500

    @staticmethod
    def get_components(steam_id):
        """获取指定用户的库存组件列表（分页、筛选、排序）"""
        try:
            order_by = (request.args.get('order_by') or 'unit_price').lower()
            order_dir = (request.args.get('order_dir') or 'desc').lower()
            page = request.args.get('page', 1, type=int)
            page_size = request.args.get('page_size', 20, type=int)
            offset = (page - 1) * page_size

            db = DatabaseManager()
            where_clause, params = _build_filter_conditions(steam_id)

            # 排序
            is_desc = order_dir != 'asc'
            direction = 'DESC' if is_desc else 'ASC'
            order_map = {
                'order_time': f"order_time {direction}",
                'buy_price': f"CAST(buy_price AS REAL) {direction}",
                'unit_price': f"CAST(buy_price AS REAL) {direction}",
                'yyyp_price': f"CAST(yyyp_price AS REAL) {direction}",
                'buff_price': f"CAST(buff_price AS REAL) {direction}",
                'steam_price': f"CAST(steam_price AS REAL) {direction}",
            }
            order_expr = order_map.get(order_by, order_map['unit_price'])
            order_clause = f"""
                CASE
                    WHEN buy_price IS NULL OR buy_price = '' OR buy_price = 'None' OR CAST(buy_price AS REAL) <= 0 THEN 1
                    ELSE 0
                END ASC,
                {order_expr},
                order_time DESC
            """

            sql = f"""
            SELECT
                assetid, goods_assetid, classid, item_name, weapon_name,
                float_range, weapon_type, weapon_float, weapon_level, data_user,
                buy_price, yyyp_price, buff_price, order_time, steam_price,
                steam_hash_name, sticker, pendant, rename
            FROM steam_stockComponents
            WHERE {where_clause}
            ORDER BY {order_clause}
            LIMIT ? OFFSET ?
            """
            params.extend([page_size, offset])
            results = db.execute_query(sql, tuple(params))

            components = []
            if results:
                for row in results:
                    component = {
                        'assetid': row[0],
                        'goods_assetid': row[1],
                        'component_id': row[1],
                        'classid': row[2],
                        'item_name': row[3],
                        'weapon_name': row[4],
                        'float_range': row[5],
                        'weapon_type': row[6],
                        'weapon_float': row[7],
                        'weapon_level': row[8],
                        'buy_price': safe_float(row[10]),
                        'yyyp_price': safe_float(row[11]),
                        'buff_price': safe_float(row[12]),
                        'steam_price': safe_float(row[14]),
                        'order_time': row[13],
                        'steam_hash_name': row[15],
                        'sticker': row[16],
                        'pendant': row[17],
                        'rename': row[18],
                        'component_name': row[3],
                        'component_type': row[6],
                        'quality': row[8],
                        'quantity': row[7],
                        'unit_cost': safe_float(row[10]),
                        'total_cost': safe_float(row[10]),
                        'source': '库存',
                        'purchase_date': row[13],
                        'status': '库存中',
                        'status_desc': ''
                    }
                    components.append(component)

            # 获取总数
            count_params = params[:-2]
            count_sql = f"SELECT COUNT(*) FROM steam_stockComponents WHERE {where_clause}"
            count_result = db.execute_query(count_sql, tuple(count_params))
            total = count_result[0][0] if count_result else 0

            return jsonify({
                'success': True,
                'data': components,
                'total': total,
                'page': page,
                'page_size': page_size
            }), 200

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'查询失败: {str(e)}'
            }), 500

    @staticmethod
    def get_grouped_components(steam_id):
        """按物品组合统计（聚合）库存组件"""
        try:
            page = request.args.get('page', 1, type=int)
            page_size = request.args.get('page_size', 20, type=int)
            order_by = (request.args.get('order_by') or 'unit_price').lower()
            order_dir = (request.args.get('order_dir') or 'desc').lower()
            offset = (page - 1) * page_size

            db = DatabaseManager()
            where_clause, params = _build_filter_conditions(steam_id)

            # 排序字段映射
            direction = 'ASC' if order_dir == 'asc' else 'DESC'
            avg_buy_expr = "(CASE WHEN COUNT(*) = 0 THEN 0 ELSE (SUM(CAST(buy_price AS REAL)) / COUNT(*)) END)"
            avg_yyyp_expr = "(CASE WHEN COUNT(*) = 0 THEN 0 ELSE (SUM(CAST(yyyp_price AS REAL)) / COUNT(*)) END)"
            avg_buff_expr = "(CASE WHEN COUNT(*) = 0 THEN 0 ELSE (SUM(CAST(buff_price AS REAL)) / COUNT(*)) END)"
            avg_steam_expr = "(CASE WHEN COUNT(*) = 0 THEN 0 ELSE (SUM(CAST(steam_price AS REAL)) / COUNT(*)) END)"

            yyyp_profit_expr = f"({avg_yyyp_expr} - {avg_buy_expr})"
            buff_profit_expr = f"({avg_buff_expr} - {avg_buy_expr})"
            steam_profit_expr = f"({avg_steam_expr} - {avg_buy_expr})"

            null_last_case = f"""
                CASE
                    WHEN {avg_buy_expr} IS NULL OR {avg_buy_expr} <= 0 THEN 1
                    ELSE 0
                END ASC,
            """

            order_map = {
                'count': f'item_count {direction}, item_name ASC',
                'item_count': f'item_count {direction}, item_name ASC',
                'name': 'item_name ASC',
                'buy_price': f'{avg_buy_expr} {direction}',
                'yyyp_price': f'{avg_yyyp_expr} {direction}',
                'buff_price': f'{avg_buff_expr} {direction}',
                'steam_price': f'{avg_steam_expr} {direction}',
                'yyyp_profit': f'{yyyp_profit_expr} {direction}',
                'buff_profit': f'{buff_profit_expr} {direction}',
                'steam_profit': f'{steam_profit_expr} {direction}',
                'unit_price': f'{avg_buy_expr} {direction}'
            }
            base_order = order_map.get(order_by, order_map['unit_price'])
            order_clause = f"{null_last_case} {base_order}, item_name ASC"

            sql = f"""
            SELECT
                item_name,
                steam_hash_name,
                weapon_name,
                weapon_type,
                weapon_level,
                float_range,
                MIN(classid) AS classid,
                COUNT(*) AS item_count,
                SUM(CAST(weapon_float AS REAL)) AS total_quantity,
                SUM(CAST(buy_price AS REAL)) AS total_buy_price,
                SUM(CAST(yyyp_price AS REAL)) AS total_yyyp_price,
                SUM(CAST(buff_price AS REAL)) AS total_buff_price,
                SUM(CAST(steam_price AS REAL)) AS total_steam_price,
                GROUP_CONCAT(goods_assetid) AS goods_assetids,
                GROUP_CONCAT(assetid) AS assetids,
                GROUP_CONCAT(weapon_float) AS weapon_floats,
                GROUP_CONCAT(buy_price) AS buy_prices,
                GROUP_CONCAT(yyyp_price) AS yyyp_prices,
                GROUP_CONCAT(buff_price) AS buff_prices,
                GROUP_CONCAT(steam_price) AS steam_prices,
                GROUP_CONCAT(sticker, '|||') AS stickers,
                GROUP_CONCAT(pendant, '|||') AS pendants,
                GROUP_CONCAT(rename, '|||') AS renames
            FROM steam_stockComponents
            WHERE {where_clause}
            GROUP BY item_name, steam_hash_name, weapon_name, weapon_type, weapon_level, float_range
            ORDER BY {order_clause}
            LIMIT ? OFFSET ?
            """
            params_with_limit = params + [page_size, offset]
            rows = db.execute_query(sql, tuple(params_with_limit))

            grouped_list = []
            for row in rows or []:
                goods_assetids = str(row[13]).split(',') if row[13] and row[13] != 'None' else []
                assetids = str(row[14]).split(',') if row[14] and row[14] != 'None' else []
                weapon_floats = str(row[15]).split(',') if row[15] and row[15] != 'None' else []
                buy_prices = str(row[16]).split(',') if row[16] and row[16] != 'None' else []
                yyyp_prices = str(row[17]).split(',') if row[17] and row[17] != 'None' else []
                buff_prices = str(row[18]).split(',') if row[18] and row[18] != 'None' else []
                steam_prices = str(row[19]).split(',') if row[19] and row[19] != 'None' else []
                stickers = str(row[20]).split('|||') if row[20] and row[20] != 'None' else []
                pendants = str(row[21]).split('|||') if row[21] and row[21] != 'None' else []
                renames = str(row[22]).split('|||') if row[22] and row[22] != 'None' else []

                first_assetid = assetids[0] if assetids and assetids[0] and assetids[0] != 'None' else None

                grouped_list.append({
                    "item_name": row[0],
                    "steam_hash_name": row[1],
                    "weapon_name": row[2],
                    "weapon_type": row[3],
                    "weapon_level": row[4],
                    "float_range": row[5],
                    "classid": row[6],
                    "item_count": row[7] or 0,
                    "total_quantity": round(row[8] or 0, 2),
                    "total_buy_price": round(row[9] or 0, 2),
                    "total_yyyp_price": round(row[10] or 0, 2),
                    "total_buff_price": round(row[11] or 0, 2),
                    "total_steam_price": round(row[12] or 0, 2),
                    "goods_assetids": goods_assetids,
                    "assetids": assetids,
                    "assetid": first_assetid,
                    "weapon_floats": weapon_floats,
                    "buy_prices": buy_prices,
                    "yyyp_prices": yyyp_prices,
                    "buff_prices": buff_prices,
                    "steam_prices": steam_prices,
                    "stickers": stickers,
                    "pendants": pendants,
                    "renames": renames
                })

            # 总记录数
            count_sql = f"""
            SELECT COUNT(*) FROM (
                SELECT 1
                FROM steam_stockComponents
                WHERE {where_clause}
                GROUP BY item_name, steam_hash_name, weapon_name, weapon_type, weapon_level, float_range
            ) AS grouped_items
            """
            total_rows = db.execute_query(count_sql, tuple(params))
            total = total_rows[0][0] if total_rows else 0

            return jsonify({
                "success": True,
                "data": grouped_list,
                "total": total,
                "page": page,
                "page_size": page_size
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                "success": False,
                "message": f"组合查询失败: {str(e)}",
                "error": str(e)
            }), 500
