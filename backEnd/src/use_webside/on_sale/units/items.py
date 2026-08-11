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
    def _get_buff_steam_id(account_id):
        """从 config 表取 BUFF 账号的 steamID"""
        db = DatabaseManager()
        rows = db.execute_query(
            "SELECT steamID FROM config WHERE key1 = ? AND key2 = ? AND dataID = ?",
            ('buff', 'config', account_id)
        )
        return rows[0][0] if rows else None

    # BUFF 支持的在售页子类型。转租/过户/秒到账是悠悠有品特有玩法，BUFF 没有
    BUFF_TRADE_TYPES = ('sale', 'offer', 'purchase_request', 'favorite', 'rented_out', 'lease')

    @staticmethod
    def _get_buff_on_sale_items(account_id, trade_type):
        """BUFF 在售页列表：调 Spider 拿数据，再从本地库补购入价"""
        if trade_type not in OnSaleItems.BUFF_TRADE_TYPES:
            return jsonify({
                'success': False,
                'message': f'BUFF 暂不支持 {trade_type} 类型'
            }), 400

        steam_id = OnSaleItems._get_buff_steam_id(account_id)
        if not steam_id:
            return jsonify({'success': False, 'message': '未找到BUFF账号配置'}), 404

        spider_response = requests.post(
            f"{SPIDER_API_ADDRESS}/spiderApiV2/src/web_site/buff/units/on_sale/sell/getOnSaleList",
            json={'steamID': steam_id, 'page': 1, 'pageSize': 40, 'tradeType': trade_type},
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
                'message': spider_data.get('message', '获取BUFF在售列表失败')
            }), 500

        db = DatabaseManager()
        items = []
        for it in spider_data.get('data', []):
            asset_id = it.get('steam_asset_id')
            buy_price = None
            if asset_id:
                try:
                    rows = db.execute_query(
                        "SELECT buy_price FROM steam_inventory WHERE assetid = ? LIMIT 1",
                        (str(asset_id),)
                    )
                    if rows:
                        buy_price = rows[0][0]
                except Exception as e:
                    print(f"查询购入价格失败 - assetid: {asset_id}, 错误: {str(e)}")

            try:
                sale_price = float(it.get('sale_price') or 0)
            except (TypeError, ValueError):
                sale_price = 0.0

            items.append({
                'id': it.get('id'),
                'item_name': it.get('item_name'),
                'steam_hash_name': it.get('steam_hash_name'),
                'weapon_float': it.get('weapon_float'),
                'sale_price': sale_price,
                'buy_price': buy_price,
                'platform': 'buff',
                'account_id': int(account_id),
                'trade_type': trade_type,
                'sticker': it.get('sticker'),
                'pendant': it.get('pendant'),
                'rename': it.get('rename'),
                'steam_asset_id': asset_id,
                'img_url': it.get('img_url'),
                'status': it.get('state'),
                'paintseed': it.get('paintseed'),
                'goods_id': it.get('goods_id'),
            })

        return jsonify({
            'success': True,
            'data': items,
            'total': spider_data.get('total', len(items))
        }), 200

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

            if platform not in ('yyyp', 'buff'):
                return jsonify({
                    'success': False,
                    'message': f'暂不支持 {platform} 平台'
                }), 400

            if platform == 'buff':
                return OnSaleItems._get_buff_on_sale_items(account_id, trade_type)

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
            # 路径需与 Spider 的蓝图注册一致：/spiderApiV2 + /src + /web_site/youping
            spider_endpoint_map = {
                'sale': '/spiderApiV2/src/web_site/youping/units/on_sale/sell/getSellList',
                'lease': '/spiderApiV2/src/web_site/youping/units/on_sale/lent/getLeaseList',
                'sublease': '/spiderApiV2/src/web_site/youping/units/on_sale/sublease/getSubleaseList',
                'presale': '/spiderApiV2/src/web_site/youping/units/on_sale/presale/getPresaleList',
                'transfer': '/spiderApiV2/src/web_site/youping/units/on_sale/transfer/getTransferList'
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
    def _call_buff_spider(endpoint, payload, action):
        """统一调 BUFF Spider 的写操作，把 Spider 的失败原文透出去"""
        try:
            resp = requests.post(
                f"{SPIDER_API_ADDRESS}/spiderApiV2/src/web_site/buff/units/on_sale/sell/{endpoint}",
                json=payload,
                timeout=30
            )
            body = resp.json()
            if resp.status_code == 200 and body.get('success'):
                return jsonify({'success': True, 'message': body.get('message', f'{action}成功')}), 200
            return jsonify({
                'success': False,
                'message': body.get('message', f'{action}失败')
            }), resp.status_code if resp.status_code != 200 else 400
        except requests.exceptions.Timeout:
            return jsonify({'success': False, 'message': f'{action}请求超时'}), 500
        except requests.exceptions.RequestException as e:
            return jsonify({'success': False, 'message': f'Spider服务请求失败: {str(e)}'}), 500

    @staticmethod
    def _buff_cancel(item_id, account_id):
        """BUFF 下架"""
        steam_id = OnSaleItems._get_buff_steam_id(account_id)
        if not steam_id:
            return jsonify({'success': False, 'message': '未找到BUFF账号配置'}), 404
        return OnSaleItems._call_buff_spider(
            'cancelListing',
            {'steamID': steam_id, 'sellOrderIds': [str(item_id)]},
            '下架'
        )

    @staticmethod
    def update_sale_price():
        """改价：按 platform 分流，目前仅 BUFF 已接入"""
        try:
            data = request.get_json() or {}
            item_id = data.get('id')
            new_price = data.get('new_price')
            account_id = data.get('account_id')
            platform = data.get('platform', '')

            if not item_id or new_price in (None, ''):
                return jsonify({'success': False, 'message': '缺少必要参数: id 或 new_price'}), 400

            if platform != 'buff':
                return jsonify({
                    'success': False,
                    'message': f'{platform or "该"} 平台的改价功能尚未接入，请前往对应平台APP操作'
                }), 400

            steam_id = OnSaleItems._get_buff_steam_id(account_id)
            if not steam_id:
                return jsonify({'success': False, 'message': '未找到BUFF账号配置'}), 404

            return OnSaleItems._call_buff_spider(
                'changePrice',
                {
                    'steamID': steam_id,
                    'items': [{
                        'sell_order_id': str(item_id),
                        'assetid': str(data.get('steam_asset_id') or ''),
                        'price': new_price,
                        'listing_type': 'sell',
                    }]
                },
                '改价'
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'改价失败: {str(e)}'}), 500

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

            if platform == 'buff':
                return OnSaleItems._buff_cancel(item_id, account_id)

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
