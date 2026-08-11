"""
Steam inventory 处理模块
提供 Spider/前端所需的 Steam 库存插入、查询、删除与价格更新接口
逻辑完整迁移自 web_side/steam/inventory.py
"""
import json
from flask import jsonify, request
from src.db_manager.steam.model.steam_inventory import SteamInventoryModel
from src.db_manager.index.model.weapon_classID import WeaponClassIDModel
from src.db_manager.index.model.buy import BuyModel


def _get_auto_price(item_name):
    if not item_name:
        return None
    for keyword in ['赛季奖牌', '奖牌', '勋章', '徽章', '布章', '硬币']:
        if keyword in item_name:
            return 0
    if '库存存储组件' in item_name:
        return 14
    return None


def _get_price_from_buy_table(item_name, weapon_float=None, order_time=None, steam_hash_name=None):
    from src.db_manager.database import DatabaseManager
    db = DatabaseManager()
    if not steam_hash_name:
        return None
    if weapon_float:
        result = db.execute_query("SELECT price FROM buy WHERE steam_hash_name = ? AND weapon_float = ? LIMIT 1", (steam_hash_name, weapon_float))
        if result:
            return result[0][0]
    if order_time:
        try:
            from datetime import datetime, timedelta
            order_dt = None
            if isinstance(order_time, str):
                for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%Y/%m/%d %H:%M:%S', '%Y/%m/%d']:
                    try:
                        order_dt = datetime.strptime(order_time, fmt)
                        break
                    except ValueError:
                        pass
                if not order_dt:
                    try:
                        order_dt = datetime.fromtimestamp(float(order_time))
                    except Exception:
                        pass
            elif isinstance(order_time, (int, float)):
                order_dt = datetime.fromtimestamp(order_time)
            else:
                order_dt = order_time
            if order_dt:
                start_time = (order_dt - timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
                end_time = (order_dt + timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
                avg_result = db.execute_query("SELECT AVG(CAST(price AS REAL)) FROM buy WHERE steam_hash_name = ? AND order_time >= ? AND order_time <= ?", (steam_hash_name, start_time, end_time))
                if avg_result and avg_result[0][0] is not None:
                    return round(avg_result[0][0], 2)
                if not weapon_float:
                    return None
        except Exception as e:
            print(f"时间范围查询价格失败: {e}")
    latest = db.execute_query("SELECT price FROM buy WHERE steam_hash_name = ? ORDER BY order_time DESC LIMIT 1", (steam_hash_name,))
    if latest:
        return latest[0][0]
    return None


def _build_inventory_record(item_data, steam_id=None):
    """从请求数据构建 SteamInventoryModel 实例"""
    record = SteamInventoryModel()
    record.assetid = item_data.get('assetid')
    record.instanceid = item_data.get('instanceid')
    record.classid = item_data.get('classid')
    record.data_user = item_data.get('steamId') or steam_id

    tags = item_data.get('tags', {})
    parsed_name = tags.get('parsed_name', {})
    record.weapon_type = parsed_name.get('weapon_type')
    record.weapon_name = parsed_name.get('weapon_name')
    record.item_name = parsed_name.get('item_name') or item_data.get('name')
    record.steam_hash_name = item_data.get('market_hash_name')

    exterior = tags.get('Exterior', {})
    record.float_range = exterior.get('localized_tag_name')

    weapon_float = item_data.get('weapon_float')
    rename_value = item_data.get('rename')
    certificate_value = item_data.get('weapon_certificate')

    if weapon_float is None or rename_value is None or certificate_value is None:
        for prop in item_data.get('asset_properties', []):
            pid = prop.get('propertyid')
            if pid == 2 and weapon_float is None:
                weapon_float = prop.get('float_value')
            elif pid == 5 and rename_value is None:
                rename_value = prop.get('string_value')
            elif pid == 6 and certificate_value is None:
                certificate_value = prop.get('string_value')

    record.weapon_float = weapon_float
    record.rename = rename_value or None
    record.weapon_certificate = certificate_value or None

    remake = item_data.get('remake')
    record.remark = remake if remake else item_data.get('trade_lock_info') or None

    # 处理印花
    sticker_info = item_data.get('sticker')
    if sticker_info:
        try:
            sticker_list = json.loads(sticker_info)
            sticker_with_hash = []
            for name in sticker_list:
                recs = WeaponClassIDModel.find_all(where="[market_listing_item_name] LIKE ? AND [weapon_type] != ?", params=(f'%{name}%', '印花板'))
                sticker_with_hash.append({'name': name, 'steam_hash_name': recs[0].steam_hash_name if recs else None})
            record.sticker = json.dumps(sticker_with_hash, ensure_ascii=False)
        except Exception:
            record.sticker = sticker_info
    else:
        record.sticker = None

    # 处理挂件
    pendant_info = item_data.get('pendant')
    if pendant_info:
        try:
            pendant_name = json.loads(pendant_info) if isinstance(pendant_info, str) else pendant_info
            recs = WeaponClassIDModel.find_all(where="[market_listing_item_name] LIKE ?", params=(f'%{pendant_name}%',))
            record.pendant = json.dumps({'name': pendant_name, 'steam_hash_name': recs[0].steam_hash_name if recs else None}, ensure_ascii=False)
        except Exception:
            record.pendant = pendant_info
    else:
        record.pendant = None

    return record, weapon_float


class InventoryHandler:

    @staticmethod
    def insert_inventory():
        """插入单条 Steam 库存数据"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': '无效的JSON数据'}), 400

            record, weapon_float = _build_inventory_record(data)
            buy_price = data.get('buy_price')
            order_time = data.get('order_time')
            steam_hash_name = record.steam_hash_name

            if buy_price is None or buy_price in ('', 'None'):
                auto_price = _get_auto_price(record.item_name)
                if auto_price is not None:
                    buy_price = auto_price
                else:
                    buy_price = _get_price_from_buy_table(record.item_name, weapon_float, order_time, steam_hash_name)

            record.buy_price = buy_price
            record.if_inventory = '1'
            saved = record.save()

            if saved:
                return jsonify({'success': True, 'message': '库存数据插入成功', 'data': {'assetid': data.get('assetid'), 'weapon_name': record.weapon_name, 'item_name': record.item_name, 'weapon_float': weapon_float}}), 200
            return jsonify({'success': False, 'error': '数据插入失败'}), 500
        except Exception as e:
            import traceback
            print(f"服务器错误: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def get_inventory_by_user(data_user):
        """根据 Steam ID 获取库存列表"""
        try:
            limit = request.args.get('limit', 100, type=int)
            offset = request.args.get('offset', 0, type=int)
            records = SteamInventoryModel.find_by_user(data_user, limit, offset)
            inventory_list = [{'assetid': r.assetid, 'instanceid': r.instanceid, 'classid': r.classid, 'weapon_name': r.weapon_name, 'item_name': r.item_name, 'weapon_type': r.weapon_type, 'weapon_float': r.weapon_float, 'float_range': r.float_range, 'remark': r.remark, 'steam_hash_name': r.steam_hash_name, 'buy_price': r.buy_price, 'yyyp_price': r.yyyp_price, 'buff_price': r.buff_price, 'steam_price': r.steam_price, 'order_time': r.order_time, 'rename': r.rename, 'sticker': r.sticker, 'pendant': r.pendant} for r in records]
            return jsonify({'success': True, 'data': inventory_list, 'count': len(inventory_list)}), 200
        except Exception as e:
            import traceback
            print(f"查询库存失败: {e}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'查询失败: {str(e)}'}), 500

    @staticmethod
    def count_inventory(data_user):
        """统计用户库存数量"""
        try:
            count = len(SteamInventoryModel.find_by_user(data_user))
            return jsonify({'success': True, 'data': {'user_id': data_user, 'count': count}}), 200
        except Exception as e:
            import traceback
            print(f"统计库存失败: {e}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'统计失败: {str(e)}'}), 500

    @staticmethod
    def delete_user_inventory(data_user):
        """删除指定用户的所有库存记录"""
        try:
            count_before = SteamInventoryModel.count("data_user = ?", (data_user,))
            if count_before == 0:
                return jsonify({'success': True, 'message': '没有需要删除的记录', 'deleted_count': 0}), 200
            from src.db_manager.database import DatabaseManager
            db = DatabaseManager()
            sql = f"DELETE FROM {SteamInventoryModel.get_table_name()} WHERE data_user = ?"
            deleted_count = db.execute_update(sql, (data_user,))
            return jsonify({'success': True, 'message': f'成功删除 {deleted_count} 条库存记录', 'deleted_count': deleted_count}), 200
        except Exception as e:
            import traceback
            print(f"删除库存失败: {e}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'删除失败: {str(e)}'}), 500

    @staticmethod
    def insert_inventory_batch():
        """批量插入/更新 Steam 库存数据"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': '无效的JSON数据'}), 400

            steam_id = data.get('steamId')
            items = data.get('items', [])
            if not steam_id or not items:
                return jsonify({'success': False, 'error': 'steamId和items不能为空'}), 400

            new_assetids = [item.get('assetid') for item in items if item.get('assetid')]
            removed_count = 0
            if new_assetids:
                from src.db_manager.database import DatabaseManager
                db = DatabaseManager()
                placeholders = ','.join(['?' for _ in new_assetids])
                mark_removed_sql = f"UPDATE {SteamInventoryModel.get_table_name()} SET if_inventory = '0' WHERE data_user = ? AND if_inventory = '1' AND assetid NOT IN ({placeholders})"
                removed_count = db.execute_update(mark_removed_sql, tuple([steam_id] + new_assetids))

            success_count = update_count = insert_count = fail_count = 0
            price_filled_count = price_not_filled_count = 0
            failed_items = []

            for item_data in items:
                try:
                    record, weapon_float = _build_inventory_record(item_data, steam_id)
                    assetid = item_data.get('assetid')
                    existing_record = SteamInventoryModel.find_by_assetid(assetid)

                    buy_price = item_data.get('buy_price')
                    order_time = item_data.get('order_time')
                    steam_hash_name = record.steam_hash_name
                    price_auto_filled = False

                    if buy_price is None or buy_price in ('', 'None'):
                        if existing_record and existing_record.buy_price:
                            buy_price = existing_record.buy_price
                        else:
                            auto_price = _get_auto_price(record.item_name)
                            if auto_price is not None:
                                buy_price = auto_price
                                price_auto_filled = True
                            else:
                                buy_price_from_db = _get_price_from_buy_table(record.item_name, weapon_float, order_time, steam_hash_name)
                                if buy_price_from_db is not None:
                                    buy_price = buy_price_from_db
                                    price_auto_filled = True
                            if price_auto_filled:
                                price_filled_count += 1
                            else:
                                price_not_filled_count += 1

                    record.buy_price = buy_price
                    record.if_inventory = '1'

                    if existing_record:
                        from src.db_manager.database import DatabaseManager
                        db = DatabaseManager()
                        update_sql = f"UPDATE {SteamInventoryModel.get_table_name()} SET instanceid=?, classid=?, item_name=?, weapon_name=?, float_range=?, weapon_type=?, weapon_float=?, remark=?, data_user=?, buy_price=?, steam_hash_name=?, rename=?, sticker=?, pendant=?, if_inventory='1' WHERE assetid=?"
                        affected = db.execute_update(update_sql, (record.instanceid, record.classid, record.item_name, record.weapon_name, record.float_range, record.weapon_type, record.weapon_float, record.remark, steam_id, record.buy_price, record.steam_hash_name, record.rename, record.sticker, record.pendant, assetid))
                        if affected > 0:
                            success_count += 1
                            update_count += 1
                        else:
                            fail_count += 1
                            failed_items.append({'assetid': assetid, 'reason': '更新失败'})
                    else:
                        saved = record.save()
                        if saved:
                            success_count += 1
                            insert_count += 1
                            if item_data.get('classid') == '3604678661':
                                from src.db_manager.database import DatabaseManager
                                db = DatabaseManager()
                                db.execute_update(f"UPDATE {SteamInventoryModel.get_table_name()} SET item_name=?, weapon_float=? WHERE assetid=?", (record.item_name, record.weapon_float, assetid))
                        else:
                            fail_count += 1
                            failed_items.append({'assetid': assetid, 'reason': '插入失败'})
                except Exception as e:
                    fail_count += 1
                    failed_items.append({'assetid': item_data.get('assetid'), 'reason': str(e)})

            return jsonify({'success': True, 'message': '批量更新完成', 'data': {'success_count': success_count, 'update_count': update_count, 'insert_count': insert_count, 'removed_count': removed_count, 'fail_count': fail_count, 'total': len(items), 'price_filled_count': price_filled_count, 'price_not_filled_count': price_not_filled_count, 'failed_items': failed_items or None}}), 200
        except Exception as e:
            import traceback
            print(f"批量插入服务器错误: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def update_buy_price(steam_id, assetid):
        """更新库存物品的购入价格"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
            buy_price = data.get('buy_price')
            from src.db_manager.database import DatabaseManager
            db = DatabaseManager()
            affected = db.execute_update(
                'UPDATE [steam_inventory] SET [buy_price] = ? WHERE [data_user] = ? AND [assetid] = ?',
                (buy_price, steam_id, assetid))
            if affected > 0:
                return jsonify({'success': True, 'message': '更新成功', 'affected': affected}), 200
            return jsonify({'success': False, 'error': '未找到匹配的记录'}), 404
        except Exception as e:
            import traceback
            print(f"更新buy_price时出错: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def insert_ingame_buy():
        """插入游戏内购买记录到 buy 主表（Steam 交易历史调用）
        请求体: {"ID": "...", "weapon_name": "...", "item_name": "...", "price": 1.0, "order_time": "...", "steam_id": "...", "data_user": "..."}
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': '无效的JSON数据'}), 400

            buy_id = data.get('ID')
            if not buy_id:
                return jsonify({'success': False, 'error': 'ID不能为空'}), 400

            # 检查是否已存在
            existing = BuyModel.find_by_primary_key(buy_id)
            if existing:
                return jsonify({'success': True, 'message': '记录已存在，跳过插入'}), 200

            record = BuyModel()
            record.ID = buy_id
            record.weapon_name = data.get('weapon_name', '')
            record.weapon_type = data.get('weapon_type', '')
            record.item_name = data.get('item_name', '')
            record.weapon_float = data.get('weapon_float')
            record.float_range = data.get('float_range', '')
            record.price = data.get('price')
            record.order_time = data.get('order_time')
            record.steam_id = data.get('steam_id', '')
            record.data_user = data.get('data_user', '')
            record.status = data.get('status', '游戏内购买')
            record.data_from = 'steam'
            record.save()

            return jsonify({'success': True, 'message': '插入成功'}), 200
        except Exception as e:
            import traceback
            print(f"插入游戏内购买记录失败: {e}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def batch_update_buff_price():
        """批量更新 Steam 库存中 BUFF 平台价格
        请求体: {"weapon_list": [{"assetid": "...", "instanceid": "...", "steam_price": 1.0, "buff_price": 2.0}, ...]}
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
            weapon_list = data.get('weapon_list', [])
            if not weapon_list:
                return jsonify({'success': False, 'error': 'weapon_list不能为空'}), 400

            from src.db_manager.database import DatabaseManager
            db = DatabaseManager()
            success_count = failed_count = 0
            for item in weapon_list:
                try:
                    assetid = item.get('assetid')
                    instanceid = item.get('instanceid')
                    buff_price = item.get('buff_price')
                    steam_price = item.get('steam_price')
                    if not assetid:
                        failed_count += 1
                        continue
                    sql = "UPDATE steam_inventory SET buff_price = ?, steam_price = ? WHERE assetid = ? AND instanceid = ?"
                    affected = db.execute_update(sql, (buff_price, steam_price, assetid, instanceid))
                    if affected > 0:
                        success_count += 1
                    else:
                        failed_count += 1
                except Exception:
                    failed_count += 1

            return jsonify({
                'success': True,
                'data': {'total': len(weapon_list), 'success_count': success_count, 'failed_count': failed_count}
            }), 200
        except Exception as e:
            import traceback
            print(f"批量更新BUFF价格失败: {e}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def batch_update_yyyp_price():
        """批量更新 Steam 库存中悠悠有品平台价格
        请求体: {"weapon_list": [{"assetid": "...", "instanceid": "...", "yyyp_price": 1.0, "steam_price": 2.0, ...}, ...]}
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': '无效的JSON数据'}), 400
            weapon_list = data.get('weapon_list', [])
            if not weapon_list:
                return jsonify({'success': False, 'error': 'weapon_list不能为空'}), 400

            from src.db_manager.database import DatabaseManager
            db = DatabaseManager()
            success_count = failed_count = 0
            error_messages = []
            for item in weapon_list:
                try:
                    assetid = item.get('assetid')
                    instanceid = item.get('instanceid')
                    yyyp_price = item.get('yyyp_price')
                    steam_price = item.get('steam_price')
                    if not assetid:
                        failed_count += 1
                        continue
                    sql = "UPDATE steam_inventory SET yyyp_price = ?, steam_price = ? WHERE assetid = ? AND instanceid = ?"
                    affected = db.execute_update(sql, (yyyp_price, steam_price, assetid, instanceid))
                    if affected > 0:
                        success_count += 1
                    else:
                        failed_count += 1
                        error_messages.append(f"assetid={assetid} 未找到匹配记录")
                except Exception as ex:
                    failed_count += 1
                    error_messages.append(str(ex))

            return jsonify({
                'success': True,
                'data': {
                    'total': len(weapon_list),
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'error_messages': error_messages[:10]
                }
            }), 200
        except Exception as e:
            import traceback
            print(f"批量更新悠悠有品价格失败: {e}\n{traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500
