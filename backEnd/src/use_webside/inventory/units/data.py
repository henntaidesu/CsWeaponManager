"""
Inventory 页面库存数据模块
提供库存列表查询（普通/分组）、购入价自动填充、购入价更新
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager

STEAM_INVENTORY_TABLE = "steam_inventory"


def get_auto_price(item_name):
    """
    根据物品名称自动填充价格
    返回: float 价格，或 None（需要从buy表查询）
    """
    if not item_name:
        return None

    # 价格为0的物品关键词
    zero_price_keywords = ['赛季奖牌', '奖牌', '勋章', '徽章', '布章', '硬币']
    for keyword in zero_price_keywords:
        if keyword in item_name:
            return 0

    # 库存存储组件价格为14
    if '库存存储组件' in item_name:
        return 14

    # 其他物品返回None，需要从buy表查询
    return None


def get_price_from_buy_table(item_name, weapon_float=None, order_time=None, steam_hash_name=None):
    """
    从buy表查询价格（只使用 steam_hash_name）

    参数:
        item_name: 物品名称（已不再用于匹配，仅保留参数以兼容旧调用）
        weapon_float: 磨损值
        order_time: 订单时间（用于时间范围查询）
        steam_hash_name: Steam市场hash名称（用于精确匹配）

    逻辑（统一只用 steam_hash_name，不再使用 item_name）:
        1. 如果有 weapon_float，先用 steam_hash_name + weapon_float 精确匹配
        2. 如果精确匹配失败且有 order_time，用 steam_hash_name 在前后24小时内查询平均价
        3. 如果没有 order_time 或时间范围查询失败，用 steam_hash_name 查询最新一条价格
        4. 如果以上都失败，返回 None
    """
    db = DatabaseManager()

    if not steam_hash_name:
        print(f"❌ 未找到价格（缺少 steam_hash_name）- item_name: {item_name}, weapon_float: {weapon_float}, order_time: {order_time}")
        return None

    if weapon_float:
        # 第一步：使用 steam_hash_name + weapon_float 进行精确匹配
        price_sql = "SELECT price FROM buy WHERE steam_hash_name = ? AND weapon_float = ? LIMIT 1"
        price_result = db.execute_query(price_sql, (steam_hash_name, weapon_float))
        if price_result and len(price_result) > 0:
            print(f"✅ 精确匹配成功（steam_hash_name + float）- {steam_hash_name}, float: {weapon_float}, price: {price_result[0][0]}")
            return price_result[0][0]

        # 第二步：精确匹配失败，尝试使用时间范围或最新数据
        if order_time:
            avg_price = _query_avg_price_by_time_range(db, steam_hash_name, order_time)
            if avg_price is not None:
                return avg_price

        # 第三步：查询最新的一条数据
        latest_sql = """
        SELECT price
        FROM buy
        WHERE steam_hash_name = ?
        ORDER BY order_time DESC
        LIMIT 1
        """
        latest_result = db.execute_query(latest_sql, (steam_hash_name,))
        if latest_result and len(latest_result) > 0:
            print(f"✅ 最新数据匹配成功（steam_hash_name）- {steam_hash_name}, price: {latest_result[0][0]}")
            return latest_result[0][0]
    else:
        # 没有磨损值的情况
        if order_time:
            avg_price = _query_avg_price_by_time_range(db, steam_hash_name, order_time)
            if avg_price is not None:
                return avg_price
            # 24小时内没有记录，直接返回 None
            print(f"⚠️  24小时内无记录（无float）- steam_hash_name: {steam_hash_name}")
            return None

        # 没有 order_time，查询最新的一条数据
        latest_sql = """
        SELECT price
        FROM buy
        WHERE steam_hash_name = ?
        ORDER BY order_time DESC
        LIMIT 1
        """
        latest_result = db.execute_query(latest_sql, (steam_hash_name,))
        if latest_result and len(latest_result) > 0:
            print(f"✅ 最新数据匹配成功（steam_hash_name，无float）- {steam_hash_name}, price: {latest_result[0][0]}")
            return latest_result[0][0]

        print(f"❌ 未找到价格（无float）- steam_hash_name: {steam_hash_name}")
        return None

    print(f"❌ 未找到价格 - steam_hash_name: {steam_hash_name}, weapon_float: {weapon_float}, item_name: {item_name}")
    return None


def _query_avg_price_by_time_range(db, steam_hash_name, order_time):
    """查询前后24小时内的平均价格"""
    try:
        from datetime import datetime, timedelta

        if isinstance(order_time, str):
            order_dt = None
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%Y/%m/%d %H:%M:%S', '%Y/%m/%d']:
                try:
                    order_dt = datetime.strptime(order_time, fmt)
                    break
                except ValueError:
                    continue
            if order_dt is None:
                try:
                    order_dt = datetime.fromtimestamp(float(order_time))
                except Exception:
                    return None
        elif isinstance(order_time, (int, float)):
            order_dt = datetime.fromtimestamp(order_time)
        else:
            order_dt = order_time

        if not order_dt:
            return None

        start_time = order_dt - timedelta(hours=24)
        end_time = order_dt + timedelta(hours=24)

        start_time_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_time_str = end_time.strftime('%Y-%m-%d %H:%M:%S')

        time_range_sql = """
        SELECT AVG(CAST(price AS REAL))
        FROM buy
        WHERE steam_hash_name = ?
        AND order_time >= ?
        AND order_time <= ?
        """
        avg_result = db.execute_query(time_range_sql, (steam_hash_name, start_time_str, end_time_str))
        if avg_result and len(avg_result) > 0 and avg_result[0][0] is not None:
            avg_price = round(avg_result[0][0], 2)
            print(f"✅ 时间范围匹配成功（steam_hash_name）- {steam_hash_name}, 时间: {start_time_str} ~ {end_time_str}, price: {avg_price}")
            return avg_price
    except Exception as e:
        print(f"使用时间范围查询价格失败: {str(e)}")

    return None


def _build_filter_conditions(steam_id):
    """构建通用的筛选条件"""
    search_text = request.args.get('search', '')
    weapon_type = request.args.get('weapon_type', '')
    float_range = request.args.get('float_range', '')
    classid = request.args.get('classid', '')
    pendant_filter = request.args.get('pendant_filter', '')
    sticker_filter = request.args.get('sticker_filter', '')
    rename_filter = request.args.get('rename_filter', '')
    trade_restriction_filter = request.args.get('trade_restriction_filter', '')

    where_conditions = ["data_user = ?", "if_inventory = '1'"]
    params = [steam_id]

    if search_text:
        where_conditions.append("(item_name LIKE ? OR weapon_name LIKE ?)")
        search_pattern = f"%{search_text}%"
        params.extend([search_pattern, search_pattern])

    if weapon_type:
        where_conditions.append("weapon_type = ?")
        params.append(weapon_type)

    if float_range:
        where_conditions.append("float_range = ?")
        params.append(float_range)

    if classid:
        where_conditions.append("classid = ?")
        params.append(classid)

    if pendant_filter == 'has':
        where_conditions.append("(pendant IS NOT NULL AND pendant != '')")
    elif pendant_filter == 'none':
        where_conditions.append("(pendant IS NULL OR pendant = '')")

    if sticker_filter == 'has':
        where_conditions.append("(sticker IS NOT NULL AND sticker != '')")
    elif sticker_filter == 'none':
        where_conditions.append("(sticker IS NULL OR sticker = '')")

    if rename_filter == 'has':
        where_conditions.append("(rename IS NOT NULL AND rename != '')")
    elif rename_filter == 'none':
        where_conditions.append("(rename IS NULL OR rename = '')")

    if trade_restriction_filter == 'has':
        where_conditions.append("(remark IS NOT NULL AND remark != '')")
    elif trade_restriction_filter == 'none':
        where_conditions.append("(remark IS NULL OR remark = '')")

    where_clause = " AND ".join(where_conditions)
    return where_clause, params


class InventoryData:

    @staticmethod
    def get_inventory(steam_id):
        """获取指定用户的库存列表"""
        try:
            limit = request.args.get('limit', 100, type=int)
            offset = request.args.get('offset', 0, type=int)

            where_clause, params = _build_filter_conditions(steam_id)

            db = DatabaseManager()

            sql = f"""
            SELECT
                si.assetid, si.instanceid, si.classid, si.item_name, si.weapon_name, si.float_range,
                si.weapon_type, si.weapon_float, si.remark, si.data_user, si.buy_price, si.yyyp_price,
                si.buff_price, si.steam_price, si.order_time, si.steam_hash_name,
                si.sticker, si.pendant, si.rename
            FROM {STEAM_INVENTORY_TABLE} si
            WHERE {where_clause.replace('data_user', 'si.data_user').replace('weapon_type', 'si.weapon_type').replace('float_range', 'si.float_range').replace('item_name', 'si.item_name').replace('weapon_name', 'si.weapon_name')}
            ORDER BY
                CASE
                    WHEN si.weapon_type = '未知物品' THEN 1
                    ELSE 0
                END,
                CAST(si.buy_price AS REAL) DESC,
                si.assetid
            LIMIT ? OFFSET ?
            """
            query_params = list(params) + [limit, offset]
            results = db.execute_query(sql, tuple(query_params))

            records = []
            if results:
                for row in results:
                    buy_price_raw = row[10] if len(row) > 10 else None
                    buy_price = buy_price_raw if buy_price_raw not in [None, '', 'None'] else None
                    item_name = row[3]

                    # 只有当buy_price为空时，才进行后续处理
                    if buy_price is None:
                        auto_price = get_auto_price(item_name)

                        if auto_price is not None:
                            buy_price = auto_price
                        else:
                            weapon_float = row[7]
                            order_time = row[14] if len(row) > 14 else None
                            steam_hash_name = row[15] if len(row) > 15 else None
                            buy_price = get_price_from_buy_table(item_name, weapon_float, order_time, steam_hash_name)

                        # 如果有价格，更新到数据库
                        if buy_price is not None:
                            update_sql = "UPDATE steam_inventory SET buy_price = ? WHERE assetid = ?"
                            affected = db.execute_update(update_sql, (buy_price, row[0]))
                            if affected > 0:
                                print(f"自动填充价格: {item_name} -> ¥{buy_price}")

                    # 如果是库存组件（classid = '3604678661'），查询实际数量
                    actual_count = None
                    if row[2] == '3604678661':
                        try:
                            count_sql = """
                            SELECT COUNT(*) FROM steam_stockComponents
                            WHERE assetid = ? AND data_user = ?
                            """
                            count_result = db.execute_query(count_sql, (row[0], steam_id))
                            actual_count = count_result[0][0] if count_result else 0
                        except Exception as e:
                            print(f"查询组件实际数量失败 - assetid: {row[0]}, 错误: {e}")
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
                        'buy_price': buy_price,
                        'yyyp_price': row[11] if len(row) > 11 else None,
                        'buff_price': row[12] if len(row) > 12 else None,
                        'steam_price': row[13] if len(row) > 13 else None,
                        'order_time': row[14] if len(row) > 14 else None,
                        'steam_hash_name': row[15] if len(row) > 15 else None,
                        'sticker': row[16] if len(row) > 16 else None,
                        'pendant': row[17] if len(row) > 17 else None,
                        'rename': row[18] if len(row) > 18 else None,
                        'actual_count': actual_count
                    }
                    records.append(record)

            # 获取总数（纯 SQL，与列表筛选条件一致）
            count_sql = f"SELECT COUNT(*) FROM {STEAM_INVENTORY_TABLE} WHERE {where_clause}"
            total_rows = db.execute_query(count_sql, tuple(params))
            total = int(total_rows[0][0]) if total_rows else 0

            return jsonify({
                'success': True,
                'data': records,
                'total': total
            }), 200

        except Exception as e:
            print(f"查询库存失败: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'查询失败: {str(e)}'
            }), 500

    @staticmethod
    def get_grouped_inventory(steam_id):
        """获取按item_name分组的库存列表（支持筛选参数）"""
        try:
            db = DatabaseManager()

            # 构建筛选条件（带si.前缀）
            search_text = request.args.get('search', '')
            weapon_type = request.args.get('weapon_type', '')
            float_range = request.args.get('float_range', '')
            pendant_filter = request.args.get('pendant_filter', '')
            sticker_filter = request.args.get('sticker_filter', '')
            rename_filter = request.args.get('rename_filter', '')
            trade_restriction_filter = request.args.get('trade_restriction_filter', '')

            where_conditions = ["si.data_user = ?", "si.if_inventory = '1'"]
            params = [steam_id]

            if search_text:
                where_conditions.append("(si.item_name LIKE ? OR si.weapon_name LIKE ?)")
                search_pattern = f"%{search_text}%"
                params.extend([search_pattern, search_pattern])

            if weapon_type:
                where_conditions.append("si.weapon_type = ?")
                params.append(weapon_type)

            if float_range:
                where_conditions.append("si.float_range = ?")
                params.append(float_range)

            if pendant_filter == 'has':
                where_conditions.append("(si.pendant IS NOT NULL AND si.pendant != '')")
            elif pendant_filter == 'none':
                where_conditions.append("(si.pendant IS NULL OR si.pendant = '')")

            if sticker_filter == 'has':
                where_conditions.append("(si.sticker IS NOT NULL AND si.sticker != '')")
            elif sticker_filter == 'none':
                where_conditions.append("(si.sticker IS NULL OR si.sticker = '')")

            if rename_filter == 'has':
                where_conditions.append("(si.rename IS NOT NULL AND si.rename != '')")
            elif rename_filter == 'none':
                where_conditions.append("(si.rename IS NULL OR si.rename = '')")

            if trade_restriction_filter == 'has':
                where_conditions.append("(si.remark IS NOT NULL AND si.remark != '')")
            elif trade_restriction_filter == 'none':
                where_conditions.append("(si.remark IS NULL OR si.remark = '')")

            where_clause = " AND ".join(where_conditions)

            sql = f"""
            SELECT
                si.item_name,
                si.weapon_name,
                si.weapon_type,
                si.float_range,
                si.steam_hash_name,
                COUNT(*) as count,
                GROUP_CONCAT(si.assetid) as assetids,
                GROUP_CONCAT(si.weapon_float) as weapon_floats,
                GROUP_CONCAT(si.remark, '|||') as remarks,
                GROUP_CONCAT(si.buy_price) as buy_prices,
                GROUP_CONCAT(si.yyyp_price) as yyyp_prices,
                GROUP_CONCAT(si.buff_price) as buff_prices,
                GROUP_CONCAT(si.steam_price) as steam_prices,
                GROUP_CONCAT(si.order_time) as order_times,
                GROUP_CONCAT(si.sticker, '|||') as stickers,
                GROUP_CONCAT(si.pendant, '|||') as pendants,
                GROUP_CONCAT(si.rename, '|||') as renames
            FROM steam_inventory si
            WHERE {where_clause}
            GROUP BY si.item_name, si.weapon_name, si.weapon_type, si.float_range, si.steam_hash_name
            ORDER BY
                CASE
                    WHEN si.weapon_type = '未知物品' THEN 1
                    ELSE 0
                END,
                si.item_name
            """

            results = db.execute_query(sql, tuple(params))

            grouped_list = []
            for row in results:
                (item_name, weapon_name, weapon_type_val, float_range_val, steam_hash_name,
                 count, assetids, weapon_floats, remarks, buy_prices,
                 yyyp_prices, buff_prices, steam_prices, order_times,
                 stickers, pendants, renames) = row

                grouped_list.append({
                    'item_name': item_name,
                    'weapon_name': weapon_name,
                    'weapon_type': weapon_type_val,
                    'float_range': float_range_val,
                    'steam_hash_name': steam_hash_name,
                    'count': count,
                    'assetids': assetids.split(',') if assetids else [],
                    'weapon_floats': weapon_floats.split(',') if weapon_floats else [],
                    'remarks': remarks.split('|||') if remarks else [],
                    'buy_prices': buy_prices.split(',') if buy_prices else [],
                    'yyyp_prices': yyyp_prices.split(',') if yyyp_prices else [],
                    'buff_prices': buff_prices.split(',') if buff_prices else [],
                    'steam_prices': steam_prices.split(',') if steam_prices else [],
                    'order_times': order_times.split(',') if order_times else [],
                    'stickers': stickers.split('|||') if stickers else [],
                    'pendants': pendants.split('|||') if pendants else [],
                    'renames': renames.split('|||') if renames else []
                })

            return jsonify({
                'success': True,
                'data': grouped_list,
                'total': len(grouped_list)
            }), 200

        except Exception as e:
            print(f"查询分组库存失败: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'查询失败: {str(e)}'
            }), 500

    @staticmethod
    def update_buy_price(steam_id, assetid):
        """更新库存物品的购入价格"""
        try:
            data = request.get_json()
            buy_price = data.get('buy_price', '')

            db = DatabaseManager()

            sql = """
            UPDATE steam_inventory
            SET buy_price = ?
            WHERE data_user = ? AND assetid = ?
            """

            affected_rows = db.execute_update(sql, (buy_price, steam_id, assetid))

            if affected_rows > 0:
                return jsonify({
                    'success': True,
                    'message': '更新成功'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': '未找到对应记录'
                }), 404

        except Exception as e:
            print(f"更新buy_price失败: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'更新失败: {str(e)}'
            }), 500
