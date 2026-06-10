# -*- coding: utf-8 -*-
"""
开发者工具 CSQAQ 历史价格采集模块
遍历 weapon_classID 中 csqaq_id 非空的数据，通过 Spider 请求 CSQAQ
单件饰品走势图（默认近三年），写入 csqaq_price_history_* 分表。
采集进度以 SSE 流式返回；同一时间仅允许一个采集任务。
"""
import json
import threading
from datetime import datetime

import requests
from flask import Response, jsonify, request, stream_with_context

SPIDER_CHART_URL = "http://127.0.0.1:9002/spiderApiV2/src/web_site/csqaq/units/QAQ_API/weapon_info/chart"

VALID_KEYS = {
    "sell_price", "buy_price", "short_lease_price", "long_lease_price",
    "lease_annual", "long_lease_annual", "sell_num", "buy_num", "lease_num",
    "turnover_number", "transfer_price",
}
# 走势图 key 中可入库的指标（lease_annual/long_lease_annual 无对应列，不支持）
STORABLE_KEYS = {
    "sell_price", "buy_price", "sell_num", "buy_num",
    "short_lease_price", "long_lease_price", "lease_num",
    "turnover_number", "transfer_price",
}
VALID_PLATFORMS = {1, 2, 3}  # 1-BUFF 2-悠悠有品 3-Steam
VALID_PERIODS = {7, 15, 30, 90, 180, 365, 1095}

# 任务控制
_stop_event = threading.Event()
_running_lock = threading.Lock()
_running = False


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _fetch_chart(good_id, key, platform, period, timeout=120):
    """
    通过 Spider 请求 CSQAQ 走势图数据。
    Spider 端有统一请求队列限速（约3秒/请求），timeout 需留足排队时间。

    :return: (success, [(date_str, value)], message)
    """
    try:
        resp = requests.post(SPIDER_CHART_URL, json={
            'good_id': int(good_id),
            'key': key,
            'platform': int(platform),
            'period': int(period),
            'style': 'all_style',
        }, timeout=timeout)
        if resp.status_code != 200:
            return False, [], f"HTTP {resp.status_code}"
        data = (resp.json() or {}).get('data') or {}
        timestamps = data.get('timestamp') or []
        values = data.get('main_data') or []
        points = []
        for ts, value in zip(timestamps, values):
            if ts is None:
                continue
            ts = float(ts)
            if ts > 1e12:  # 毫秒时间戳
                ts /= 1000.0
            points.append((datetime.fromtimestamp(ts).strftime('%Y-%m-%d'), value))
        return True, points, ''
    except Exception as e:
        return False, [], str(e)


class DevToolsCsqaqHistory:
    """开发者工具 CSQAQ 历史价格采集类"""

    @staticmethod
    def fetch_price_history():
        """
        采集 CSQAQ 历史价格数据（SSE 流式返回进度）
        请求体: {
            platforms: [1, 2],                     # 平台列表，默认 BUFF+悠悠有品
            keys: ['sell_price', 'sell_num'],      # 指标列表
            period: 1095,                          # 周期天数，默认近三年
            skip_existing: true                    # 跳过已有数据的饰品（断点续传）
        }
        """
        global _running
        payload = request.get_json(silent=True) or {}
        platforms = payload.get('platforms') or [1, 2]
        keys = payload.get('keys') or ['sell_price', 'sell_num']
        period = payload.get('period') or 1095
        skip_existing = bool(payload.get('skip_existing', True))

        try:
            platforms = [int(p) for p in platforms]
            period = int(period)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': 'platforms/period 参数格式错误'}), 400
        if not platforms or not set(platforms).issubset(VALID_PLATFORMS):
            return jsonify({'success': False, 'message': 'platforms 必须为 1-BUFF 2-悠悠有品 3-Steam 的子集'}), 400
        if not keys or not set(keys).issubset(STORABLE_KEYS):
            return jsonify({'success': False, 'message': f'keys 必须为其中之一: {sorted(STORABLE_KEYS)}'}), 400
        if period not in VALID_PERIODS:
            return jsonify({'success': False, 'message': f'period 必须为其中之一: {sorted(VALID_PERIODS)}'}), 400

        with _running_lock:
            if _running:
                return jsonify({'success': False, 'message': '已有采集任务在运行中，请先停止'}), 409
            _running = True
        _stop_event.clear()

        def generate():
            global _running
            from src.db_manager.index.model.weapon_classID import WeaponClassIDModel
            from src.db_manager.csqaq.model.csqaq_price_history import get_shard_model

            fetched = 0
            skipped = 0
            failed = 0
            rows_written = 0

            def progress_event(event_type, index, total, **extra):
                data = {
                    'type': event_type,
                    'current': index,
                    'total': total,
                    'fetched': fetched,
                    'skipped': skipped,
                    'failed': failed,
                    'rows_written': rows_written,
                }
                data.update(extra)
                return _sse(data)

            try:
                db = WeaponClassIDModel().db
                items = db.execute_query(
                    f'''SELECT [csqaq_id], MIN([market_listing_item_name])
                        FROM {WeaponClassIDModel.get_table_name()}
                        WHERE [csqaq_id] IS NOT NULL
                        GROUP BY [csqaq_id]
                        ORDER BY [csqaq_id] ASC'''
                )
                total = len(items)
                yield _sse({
                    'type': 'start', 'total': total,
                    'platforms': platforms, 'keys': keys, 'period': period,
                    'skip_existing': skip_existing,
                })

                for index, (good_id, item_name) in enumerate(items, start=1):
                    if _stop_event.is_set():
                        yield progress_event('stopped', index - 1, total)
                        return
                    try:
                        model = get_shard_model(good_id)

                        if skip_existing and model.has_data(good_id):
                            skipped += 1
                            if skipped % 100 == 0:
                                yield progress_event('progress', index, total, good_id=good_id, name=item_name)
                            continue

                        item_failed = False
                        for platform in platforms:
                            merged = {}
                            for key in keys:
                                ok, points, message = _fetch_chart(good_id, key, platform, period)
                                if not ok:
                                    item_failed = True
                                    print(f"CSQAQ走势图请求失败: good_id={good_id}, key={key}, platform={platform}, {message}")
                                    continue
                                for date_str, value in points:
                                    merged.setdefault(date_str, {})[key] = value
                            if merged:
                                rows_written += model.upsert_chart_rows(good_id, platform, merged)

                        if item_failed:
                            failed += 1
                        else:
                            fetched += 1
                        yield progress_event('progress', index, total, good_id=good_id, name=item_name)

                    except Exception as e:
                        failed += 1
                        print(f"采集CSQAQ历史价格失败: good_id={good_id}, 错误: {e}")
                        yield progress_event('progress', index, total, good_id=good_id, name=item_name, error=str(e))

                yield progress_event('complete', total, total)

            except Exception as e:
                yield _sse({'type': 'error', 'error': str(e)})
            finally:
                _running = False

        return Response(stream_with_context(generate()), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        })

    @staticmethod
    def stop_fetch_price_history():
        """停止当前采集任务"""
        if not _running:
            return jsonify({'success': True, 'message': '当前没有运行中的采集任务'})
        _stop_event.set()
        return jsonify({'success': True, 'message': '停止信号已发送，任务将在当前饰品处理完后停止'})
