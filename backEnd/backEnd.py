import threading

from flask import Flask, jsonify, request
from flask_cors import CORS

from src.db_manager import init_database
from src.db_manager.migration_gate import migration_gate
from src.units.auto_process.task_scheduler import get_scheduler

from src.API import backendV2_blueprint
from src.web_server import run_web_server

# 当前版本号
CURRENT_VERSION = '2.8.0'

# 后端 API 应用 (端口 9001)
app = Flask(__name__)
CORS(app)

# 数据库迁移期间仍然放行的接口：迁移本身，以及只读的引导配置
# （getDbConfig 直连基础 SQLite，不经过被占用的后端，前端靠它显示维护状态）
_MIGRATION_ALLOWED_PATHS = ('migrateToMysql', 'migrateToSqlite', 'getDbConfig')


@app.before_request
def _pause_during_migration():
    """数据库迁移期间暂停一切其他操作，避免打到还没准备好的目标库"""
    if not migration_gate.is_active():
        return None
    if any(key in request.path for key in _MIGRATION_ALLOWED_PATHS):
        return None

    status = migration_gate.status()
    response = jsonify({
        'error': f"系统正在迁移数据库（{status['note']}），已暂停所有其他操作，请等待迁移完成",
        'migrating': status,
    })
    response.status_code = 503
    response.headers['Retry-After'] = '30'
    return response


def blankEndApi():
    # 初始化数据库（单进程，初始化一次即可）
    if not init_database():
        print("❌ 数据库初始化失败，程序退出")
        return

    # v2 API
    app.register_blueprint(backendV2_blueprint, url_prefix='/backENDV2')  # Home V2 API（逐层传递）

    # 启动 Web 页面服务线程 (端口 9003)
    web_thread = threading.Thread(target=run_web_server, name='WebServer', daemon=True)
    web_thread.start()

    # 启动任务调度器
    scheduler = get_scheduler()
    scheduler.start()
    print("✅ 任务调度器已启动")

    # 启动后端 API (主线程, 端口 9001)
    # 多线程模式下必须关闭 reloader，否则进程自我重启会导致 Web 线程被重建
    app.run(debug=False, port=9001, host='0.0.0.0', threaded=True, use_reloader=False)


if __name__ == '__main__':
    blankEndApi()