"""
select_weapon 查询模块
提供 Spider 所需的武器查询接口（图标列表、ID 映射）
"""
from flask import jsonify, request
from src.db_manager.index.model.weapon_classID import WeaponClassIDModel


class WeaponQuery:

    # 待下载条件：if_down 为 NULL 且已存有 icon_url
    _PENDING_WHERE = "[icon_url] IS NOT NULL AND TRIM([icon_url]) != '' AND [if_down] IS NULL"

    @staticmethod
    def fetch_weapon_icons():
        """为 Spider 提供待下载的饰品图标列表"""
        try:
            where_clause = WeaponQuery._PENDING_WHERE
            pending_total = WeaponClassIDModel.count(where=where_clause)
            records = WeaponClassIDModel.find_all(where=where_clause)

            icon_list = []
            for record in records:
                icon_list.append({
                    'steam_hash_name': record.steam_hash_name,
                    'icon_url': record.icon_url,
                    'market_listing_item_name': record.market_listing_item_name,
                    'icon_from': getattr(record, 'icon_from', None)
                })

            return jsonify({
                'success': True,
                'data': icon_list,
                'count': len(icon_list),
                'pending_total': pending_total
            }), 200
        except Exception as e:
            print(f"获取待下载图标列表失败: {e}")
            import traceback
            print(f"详细错误信息: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def get_yyyp_id_by_steam_hash_name():
        """根据 steam_hash_name 批量查询悠悠有品模板 ID 和价格信息"""
        try:
            data = request.get_json() or {}
            names = data.get('steam_hash_names') or data.get('hash_names') or data.get('steamHashNames')

            if isinstance(names, str):
                names = [names]
            if not isinstance(names, list) or not names:
                return jsonify({'success': False, 'error': 'steam_hash_names 需要为非空数组或字符串'}), 400

            result = {}
            for name in names:
                if not name:
                    continue
                records = WeaponClassIDModel.find_by_steam_hash_name(name)
                if not records:
                    continue
                rec = records[0]
                result[name] = {
                    'steam_hash_name': rec.steam_hash_name,
                    'yyyp_id': getattr(rec, 'yyyp_id', None),
                    'yyyp_Price': getattr(rec, 'yyyp_Price', None),
                    'yyyp_Rent': getattr(rec, 'yyyp_Rent', None),
                    'yyyp_OnSaleCount': getattr(rec, 'yyyp_OnSaleCount', None),
                    'yyyp_OnLeaseCount': getattr(rec, 'yyyp_OnLeaseCount', None)
                }

            return jsonify({'success': True, 'data': result}), 200
        except Exception as e:
            print(f"根据steam_hash_name查询yyyp_id失败: {e}")
            import traceback
            print(f"详细错误信息: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500

    @staticmethod
    def pending_weapon_icons_count():
        """统计待下载图标数量"""
        try:
            where_clause = WeaponQuery._PENDING_WHERE
            count = WeaponClassIDModel.count(where=where_clause)
            return jsonify({'success': True, 'count': count}), 200
        except Exception as e:
            print(f"统计待下载图标数量失败: {e}")
            import traceback
            print(f"详细错误信息: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500
