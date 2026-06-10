"""
DevTools API 模块
层级蓝图注册：
- 从 settings/API.py 接收前缀 /backENDV2/src/use_webside/settings
- 注册所有 DevTools 路由，添加 /dev_tools/units/xxx 路径段
"""
from flask import Blueprint
from .units.dev_tools_adb import DevToolsAdb
from .units.dev_tools_csqaq import DevToolsCsqaq
from .units.dev_tools_csqaq_history import DevToolsCsqaqHistory
from .units.dev_tools_filters import DevToolsFilters

dev_tools_blueprint = Blueprint('dev_tools_v2', __name__)

# ADB 设备管理
dev_tools_blueprint.route('/dev_tools/units/adb/scan', methods=['POST'])(DevToolsAdb.scan_lan_devices)
dev_tools_blueprint.route('/dev_tools/units/adb/connect', methods=['POST'])(DevToolsAdb.connect_device)
dev_tools_blueprint.route('/dev_tools/units/adb/devices', methods=['GET'])(DevToolsAdb.get_devices)
dev_tools_blueprint.route('/dev_tools/units/adb/disconnect', methods=['POST'])(DevToolsAdb.disconnect_device)
dev_tools_blueprint.route('/dev_tools/units/adb/device/<serial>/info', methods=['GET'])(DevToolsAdb.get_device_info)

# ADB 证书管理
dev_tools_blueprint.route('/dev_tools/units/cert/status', methods=['POST'])(DevToolsAdb.check_cert_status)
dev_tools_blueprint.route('/dev_tools/units/cert/install', methods=['POST'])(DevToolsAdb.install_cert)
dev_tools_blueprint.route('/dev_tools/units/cert/uninstall', methods=['POST'])(DevToolsAdb.uninstall_cert)
dev_tools_blueprint.route('/dev_tools/units/cert/info', methods=['GET'])(DevToolsAdb.get_cert_info)
dev_tools_blueprint.route('/dev_tools/units/cert/verify', methods=['POST'])(DevToolsAdb.verify_cert)

# ADB Shell
dev_tools_blueprint.route('/dev_tools/units/adb/device/<serial>/shell', methods=['POST'])(DevToolsAdb.execute_shell)

# CSQAQ 映射
dev_tools_blueprint.route('/dev_tools/units/csqaq/uploadMapping', methods=['POST'])(DevToolsCsqaq.upload_mapping)

# CSQAQ 历史价格采集（SSE 流式）
dev_tools_blueprint.route('/dev_tools/units/csqaq/fetchPriceHistory', methods=['POST'])(DevToolsCsqaqHistory.fetch_price_history)
dev_tools_blueprint.route('/dev_tools/units/csqaq/stopFetchPriceHistory', methods=['POST'])(DevToolsCsqaqHistory.stop_fetch_price_history)

# 筛选数据
dev_tools_blueprint.route('/dev_tools/units/filters/getSteamAccounts', methods=['GET'])(DevToolsFilters.get_steam_accounts)
dev_tools_blueprint.route('/dev_tools/units/filters/getConfigAccounts', methods=['GET'])(DevToolsFilters.get_config_accounts)
