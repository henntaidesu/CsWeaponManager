"""
IGXE select_weapon 写入模块
提供 Spider 所需的 IGXE 饰品映射批量入库接口
"""
from flask import jsonify, request

from src.db_manager.igxe.model import IgxeProductModel
from ...hash_name import resolve_by_chinese_name


class ProductInsert:

    @staticmethod
    def batch_insert_or_update():
        """
        IGXE 专用：批量插入或更新饰品映射（product_id ↔ steam_hash_name）

        IGXE 的 home/search_product 只返回中文 market_name，因此这里按中文
        weapon_name/item_name/float_range 反查 weapon_classID 得到
        steam_hash_name；查不到就留空，记录照样入库。
        """
        try:
            data = request.get_json()
            if not data or not isinstance(data, list):
                return jsonify({'success': False, 'error': '无效的JSON数据，需要数组格式'}), 400

            matched_count = 0
            for product in data:
                steam_hash_name = resolve_by_chinese_name(
                    product.get('weapon_name'),
                    product.get('item_name'),
                    product.get('float_range'),
                )
                product['steam_hash_name'] = steam_hash_name
                if steam_hash_name:
                    matched_count += 1

            success_count = IgxeProductModel.batch_insert_or_update(data)

            return jsonify({
                'success': True,
                'message': f'成功入库 {success_count}/{len(data)} 条IGXE饰品映射，'
                           f'其中 {matched_count} 条匹配到 steam_hash_name',
                'success_count': success_count,
                'matched_count': matched_count,
                'total_count': len(data)
            }), 200
        except Exception as e:
            print(f"批量入库IGXE饰品映射失败: {e}")
            import traceback
            print(f"详细错误信息: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': f'服务器错误: {str(e)}'}), 500
