import threading

from flask import Flask
from flask_cors import CORS

from src.db_manager import init_database
from src.units.auto_process.task_scheduler import get_scheduler

from src.API import backendV2_blueprint
from src.web_server import run_web_server

# 当前版本号
CURRENT_VERSION = '2.7.1'

# 后端 API 应用 (端口 9001)
app = Flask(__name__)
CORS(app)


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
