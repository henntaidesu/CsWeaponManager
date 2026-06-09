"""
Web 页面服务 (端口 9003)

从原独立的 WebServer 合并而来：提供 WebSite/dist 静态页面 (SPA)，
并把 /api、/spider 请求分别代理到后端 (9001) 和爬虫服务 (9002)。
由 backEnd 在独立线程中启动。
"""
import os
import sys
import logging

import requests
from flask import Flask, send_from_directory, request, Response
from flask_cors import CORS

# 代理目标
BACKEND_URL = 'http://127.0.0.1:9001'
SPIDER_URL = 'http://127.0.0.1:9002'


def get_static_folder():
    """获取前端静态文件目录 (WebSite/dist)"""
    if getattr(sys, 'frozen', False):
        # 打包后: 前端资源经 --add-data 嵌入 exe，运行时解压到 sys._MEIPASS
        base_path = sys._MEIPASS
        return os.path.join(base_path, 'WebSite', 'dist')

    # 开发环境: 本文件位于 backEnd/src/，上溯三级到仓库根目录
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(repo_root, 'WebSite', 'dist')


# 注意：不设置 static_folder / static_url_path，完全由自定义路由处理
web_app = Flask('web_server', static_folder=None, static_url_path=None)
CORS(web_app)
web_app.static_folder = get_static_folder()


@web_app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_api(path):
    """代理 /api/* 请求到后端服务器 (9001)"""
    try:
        url = f'{BACKEND_URL}/{path}'

        # 检查是否为流式端点（如版本更新下载的 SSE 进度流）
        is_stream = path.endswith('downloadUpdate') or 'version_update/units/update/downloadUpdate' in path
        timeout = 600 if is_stream else 30

        # 转发请求
        resp = requests.request(
            method=request.method,
            url=url,
            headers={key: value for key, value in request.headers if key.lower() != 'host'},
            data=request.get_data(),
            params=request.args,
            allow_redirects=False,
            timeout=timeout,
            stream=is_stream
        )

        # 返回响应
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for name, value in resp.raw.headers.items()
                   if name.lower() not in excluded_headers]

        if is_stream:
            # 保持 SSE 流式响应，使前端能实时收到进度与下载速度
            return Response(
                resp.iter_content(chunk_size=1024),
                resp.status_code,
                headers,
                direct_passthrough=True
            )

        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        print(f"API代理错误: {e}")
        return {'error': str(e)}, 500


@web_app.route('/spider/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_spider(path):
    """代理 /spider/* 请求到爬虫服务器 (9002)"""
    try:
        url = f'{SPIDER_URL}/{path}'

        # 转发请求
        resp = requests.request(
            method=request.method,
            url=url,
            headers={key: value for key, value in request.headers if key.lower() != 'host'},
            data=request.get_data(),
            params=request.args,
            allow_redirects=False,
            timeout=30,
            stream=True  # 支持 SSE (Server-Sent Events)
        )

        # 返回响应
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for name, value in resp.raw.headers.items()
                   if name.lower() not in excluded_headers]

        return Response(resp.iter_content(chunk_size=1024), resp.status_code, headers)
    except Exception as e:
        print(f"Spider代理错误: {e}")
        return {'error': str(e)}, 500


@web_app.route('/', defaults={'path': ''})
@web_app.route('/<path:path>')
def serve_static(path):
    """
    提供静态文件服务
    - 如果文件存在，返回文件
    - 如果文件不存在，返回 index.html（用于 SPA 前端路由）
    """
    # 如果是根路径，直接返回 index.html
    if path == '':
        return send_from_directory(web_app.static_folder, 'index.html')

    # 构建完整的文件路径
    static_file_path = os.path.join(web_app.static_folder, path)

    # 如果文件存在且是文件（不是目录），返回该文件
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        return send_from_directory(web_app.static_folder, path)

    # SPA fallback - 所有未匹配的路由返回 index.html（支持 /inventory、/settings 等前端路由）
    return send_from_directory(web_app.static_folder, 'index.html')


def run_web_server():
    """在独立线程中启动 Web 页面服务 (端口 9003)"""
    # 开发环境下若未构建前端 (dist 不存在)，则跳过，把 9003 让给 Vite 开发服务器
    if not os.path.exists(web_app.static_folder):
        print(f"⚠️  未找到前端构建目录，跳过 Web 页面服务: {web_app.static_folder}")
        return

    # 禁用 werkzeug 的 HTTP 请求日志
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    print("=" * 50)
    print("🌐 Web 页面服务已启动 (线程)")
    print(f"📁 静态文件目录: {os.path.abspath(web_app.static_folder)}")
    print(f"🔗 访问地址: http://localhost:9003")
    print(f"🔗 访问地址: http://127.0.0.1:9003")
    print("=" * 50)

    # 线程内运行，必须关闭 reloader（reloader 仅能在主线程工作）
    web_app.run(debug=False, port=9003, host='0.0.0.0', threaded=True, use_reloader=False)
