"""
On Sale 页面商品操作模块
提供在售商品列表查询和下架功能
通过调用Spider服务获取平台数据，并从本地数据库补充购入价信息
"""
from flask import jsonify, request
from src.db_manager.database import DatabaseManager
import requests
import json

# Spider服务地址
SPIDER_API_ADDRESS = "http://127.0.0.1:9002"


class OnSaleItems:

    @staticmethod
    def get_on_sale_items():
        """获取在售商品列表"""
        try:
            data = request.get_json() or {}
            platform = data.get('platform', '')
            account_id = data.get('account_id', '')
            trade_type = data.get('trade_type', 'sale')

            if not platform or not account_id:
                return jsonify({
                    'success': False,
                    'message': '缺少必要参数: platform 和 account_id'
                }), 400

            if platform != 'yyyp':
                return jsonify({
                    'success': False,
                    'message': f'暂不支持 {platform} 平台'
                }), 400

            db = DatabaseManager()

            # 获取账号配置信息
            config_sql = """
            SELECT steamID
            FROM config
            WHERE key1 = ? AND key2 = ? AND dataID = ?
            """
            config_result = db.execute_query(config_sql, ('youpin', 'config', account_id))

            if not config_result or len(config_result) == 0:
                return jsonify({
                    'success': False,
                    'message': '未找到账号配置'
                }), 404

            steam_id = config_result[0][0]

            # 根据交易类型选择Spider API端点
            spider_endpoint_map = {
                'sale': '/spiderApiV2/youping/units/on_sale/sell/getSellList',
                'lease': '/spiderApiV2/youping/units/on_sale/lent/getLeaseList',
                'sublease': '/spiderApiV2/youping/units/on_sale/sublease/getSubleaseList',
                'presale': '/spiderApiV2/youping/units/on_sale/presale/getPresaleList',
                'transfer': '/spiderApiV2/youping/units/on_sale/transfer/getTransferList'
            }

            spider_endpoint = spider_endpoint_map.get(trade_type)
            if not spider_endpoint:
                return jsonify({
                    'success': False,
                    'message': f'不支持的交易类型: {trade_type}'
                }), 400

            # 调用Spider服务获取列表
            spider_url = f"{SPIDER_API_ADDRESS}{spider_endpoint}"
            spider_response = requests.post(
                spider_url,
                json={
                    'steamId': steam_id,
                    'page': 1,
                    'pageSize': 100
                },
                timeout=30
            )

            if spider_response.status_code != 200:
                return jsonify({
                    'success': False,
                    'message': f'Spider服务请求失败: HTTP {spider_response.status_code}'
                }), 500

            spider_data = spider_response.json()

            if not spider_data.get('success'):
                return jsonify({
                    'success': False,
                    'message': spider_data.get('message', '获取列表失败')
                }), 500

            # 转换数据格式
            result_data = spider_data.get('data', {})
            commodity_list = result_data.get('commodityInfoList', [])

            items = []
            for commodity in commodity_list:
                steam_asset_id = commodity.get('steamAssetId')

                # 通过steamAssetId查询购入价格
                buy_price = None
                if steam_asset_id:
                    try:
                        buy_price_sql = """
                        SELECT buy_price
                        FROM steam_inventory
                        WHERE assetid = ?
                        LIMIT 1
                        """
                        buy_price_result = db.execute_query(buy_price_sql, (str(steam_asset_id),))
                        if buy_price_result and len(buy_price_result) > 0:
                            buy_price = buy_price_result[0][0]
                    except Exception as e:
                        print(f"查询购入价格失败 - assetid: {steam_asset_id}, 错误: {str(e)}")

                # 获取售价
                sell_amount_desc = commodity.get('sellAmountDesc', '')
                sale_price_str = sell_amount_desc.replace('¥', '').strip() if sell_amount_desc else '0'

                try:
                    sale_price = float(sale_price_str)
                except (ValueError, TypeError):
                    sale_price = 0.0

                item = {
                    'id': commodity.get('id'),
                    'item_name': commodity.get('name'),
                    'steam_hash_name': commodity.get('commodityHashName'),
                    'weapon_type': commodity.get('typeName'),
                    'weapon_float': commodity.get('abrade'),
                    'float_range': commodity.get('exteriorName'),
                    'sale_price': sale_price,
                    'buy_price': buy_price,
                    'platform': 'yyyp',
                    'account_id': int(account_id),
                    'trade_type': trade_type,
                    'sticker': json.dumps(commodity.get('stickers', [])),
                    'pendant': json.dumps(commodity.get('pendants', [])) if commodity.get('havePendant') else None,
                    'rename': None,
                    'on_sale_time': None,
                    'steam_asset_id': steam_asset_id,
                    'template_id': commodity.get('templateId'),
                    'img_url': commodity.get('imgUrl'),
                    'status': commodity.get('status'),
                    'paintseed': commodity.get('paintseed')
                }

                items.append(item)

            return jsonify({
                'success': True,
                'data': items,
                'total': result_data.get('statisticalData', {}).get('quantity', len(items))
            }), 200

        except requests.exceptions.Timeout:
            return jsonify({
                'success': False,
                'message': 'Spider服务请求超时'
            }), 500
        except requests.exceptions.RequestException as e:
            return jsonify({
                'success': False,
                'message': f'Spider服务请求失败: {str(e)}'
            }), 500
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'获取在售商品列表失败: {str(e)}'
            }), 500

    @staticmethod
    def remove_from_sale():
        """下架商品"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'message': '请求体不能为空'
                }), 400

            item_id = data.get('id')
            account_id = data.get('account_id')
            # 兼容未传 platform 的老调用方：缺省按悠悠有品处理
            platform = data.get('platform', 'yyyp')

            if not item_id:
                return jsonify({
                    'success': False,
                    'message': '缺少必要参数: id'
                }), 400

            # 下面整段只实现了悠悠有品的下架（读 youpin 配置、调 youping 的 offShelf）。
            # 其他平台若放行，会把该平台的订单号发到悠悠有品去下架，属于静默错走，必须拦住。
            if platform != 'yyyp':
                return jsonify({
                    'success': False,
                    'message': f'{platform} 平台的下架功能尚未接入，请前往对应平台APP操作'
                }), 400

            # 如果提供了account_id，从config表获取steamId
            steam_id = None
            if account_id:
                db = DatabaseManager()
                config_sql = """
                SELECT steamID
                FROM config
                WHERE key1 = ? AND key2 = ? AND dataID = ?
                """
                config_result = db.execute_query(config_sql, ('youpin', 'config', account_id))

                if config_result and len(config_result) > 0:
                    steam_id = config_result[0][0]

            # 调用Spider服务下架商品
            spider_url = f"{SPIDER_API_ADDRESS}/spiderApiV2/src/web_site/youping/units/on_sale/sell/offShelf"
            spider_response = requests.post(
                spider_url,
                json={
                    'steamId': steam_id if steam_id else '',
                    'ids': str(item_id)
                },
                timeout=30
            )

            if spider_response.status_code != 200:
                return jsonify({
                    'success': False,
                    'message': f'Spider服务请求失败: HTTP {spider_response.status_code}'
                }), 500

            spider_data = spider_response.json()

            if spider_data.get('success'):
                return jsonify({
                    'success': True,
                    'message': '下架成功'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': spider_data.get('message', '下架失败')
                }), 400

        except requests.exceptions.Timeout:
            return jsonify({
                'success': False,
                'message': 'Spider服务请求超时'
            }), 500
        except requests.exceptions.RequestException as e:
            return jsonify({
                'success': False,
                'message': f'Spider服务请求失败: {str(e)}'
            }), 500
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': f'下架失败: {str(e)}'
            }), 500
