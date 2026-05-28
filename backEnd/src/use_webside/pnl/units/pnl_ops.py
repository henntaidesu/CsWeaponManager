"""
盈亏配对写操作:自动配对、手动配对、解绑、剔除/恢复
"""
from flask import jsonify, request

from .pnl_engine import run_auto_pairing, manual_pair, unpair, set_excluded


class PnlOps:

    @staticmethod
    def run_auto_pairing():
        """触发一次自动配对(增量)"""
        try:
            data = request.get_json() or {}
            data_user = data.get('data_user')
            steam_hash_name = data.get('steam_hash_name')
            result = run_auto_pairing(
                data_user=data_user,
                steam_hash_name=steam_hash_name,
            )
            return jsonify({'success': True, 'data': result}), 200
        except Exception as e:
            print(f"自动配对失败: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    def manual_pair():
        """
        手动建立一对配对
        Request JSON:
            buy_id (必填), buy_from (必填), buy_id_sub (可选)
            sell_id (必填), sell_id_sub (可选)
            quantity (默认 1)
        """
        try:
            data = request.get_json() or {}
            buy_id = data.get('buy_id')
            buy_from = data.get('buy_from')
            sell_id = data.get('sell_id')
            if not buy_id or not buy_from or not sell_id:
                return jsonify({'success': False, 'message': 'buy_id / buy_from / sell_id 必填'}), 400

            quantity = int(data.get('quantity', 1) or 1)
            ok, msg, pairing_id = manual_pair(
                buy_id=buy_id,
                buy_from=buy_from,
                sell_id=sell_id,
                buy_id_sub=data.get('buy_id_sub'),
                sell_id_sub=data.get('sell_id_sub'),
                quantity=quantity,
            )
            status = 200 if ok else 400
            return jsonify({'success': ok, 'message': msg, 'pairing_id': pairing_id}), status
        except Exception as e:
            print(f"手动配对失败: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    def unpair():
        """解绑配对"""
        try:
            data = request.get_json() or {}
            pairing_id = data.get('pairing_id')
            if not pairing_id:
                return jsonify({'success': False, 'message': 'pairing_id 必填'}), 400
            ok, msg = unpair(int(pairing_id))
            return jsonify({'success': ok, 'message': msg}), (200 if ok else 404)
        except Exception as e:
            print(f"解绑失败: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

    @staticmethod
    def set_excluded():
        """剔除/恢复某对配对(不释放占用,仅影响统计)"""
        try:
            data = request.get_json() or {}
            pairing_id = data.get('pairing_id')
            if not pairing_id:
                return jsonify({'success': False, 'message': 'pairing_id 必填'}), 400
            excluded = bool(data.get('excluded', True))
            reason = data.get('reason')
            ok, msg = set_excluded(int(pairing_id), excluded, reason)
            return jsonify({'success': ok, 'message': msg}), (200 if ok else 404)
        except Exception as e:
            print(f"剔除操作失败: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500
