"""
自动化任务调度器
负责在后台执行定时任务,即使前端关闭也能继续运行
"""
import threading
import time
import json
import requests
from datetime import datetime
from src.units.execution_db import Date_base
from src.units.log import Log

class TaskScheduler:
    """任务调度器类"""
    
    def __init__(self):
        self.running = False
        self.tasks = {}  # {task_id: {'timer': threading.Timer, 'config': {...}}}
        self.lock = threading.Lock()
        self.execution_lock = threading.Lock()  # 任务执行互斥锁
        self.currently_executing = {}  # {task_id: {'task_name': str, 'start_time': datetime, 'config': dict}}
        self.log = Log()
    
    def _get_config_status(self, data_id):
        """查询配置状态"""
        if not data_id:
            return None
        try:
            db = Date_base()
            query_sql = f"SELECT status FROM config WHERE dataID = {int(data_id)}"
            success, result = db.select(query_sql)
            if success and result:
                return str(result[0][0])
        except Exception as e:
            self.log.write_log(f"查询配置状态失败 (dataID={data_id}): {str(e)}", 'error')
        return None
    
    def _validate_task_source_enabled(self, automate_type, config):
        """校验任务依赖的数据源/账号是否启用"""
        if not config:
            return False, '任务配置为空'
        
        if automate_type in ['auto_update', 'auto_refresh_auth']:
            source_id = config.get('selectedSteamConfig')
            if not source_id:
                return False, '缺少账号配置'
            status = self._get_config_status(source_id)
            return (status == '1', '账号数据源未启用')
        
        if automate_type in ['auto_fetch', 'auto_platform_price']:
            source_ids = config.get('selectedDataSources') if isinstance(config.get('selectedDataSources'), list) else []
            if not source_ids:
                single_id = config.get('selectedDataSource')
                source_ids = [single_id] if single_id else []
            
            if not source_ids:
                return False, '缺少数据源配置'
            
            for source_id in source_ids:
                status = self._get_config_status(source_id)
                if status != '1':
                    return False, '存在未启用的数据源'
            return True, ''
        
        if automate_type == 'auto_search_weapon':
            source_id = config.get('selectedSearchConfig')
            if not source_id:
                return False, '缺少搜索配置'
            status = self._get_config_status(source_id)
            return (status == '1', '搜索配置未启用')
        
        return True, ''
    
    def start(self):
        """启动调度器"""
        if self.running:
            self.log.write_log("任务调度器已经在运行中", 'warning')
            return
            
        self.running = True
        self.log.write_log("任务调度器启动", 'info')
        
        # 加载并启动所有已启用的任务
        self.load_and_start_tasks()
        
        # 启动轮询线程,定期检查数据库中的任务状态变化
        self._start_polling()
        
    def stop(self):
        """停止调度器"""
        self.running = False
        
        with self.lock:
            self.tasks.clear()
        
        self.log.write_log("任务调度器已停止", 'info')
    
    def _start_polling(self):
        """启动轮询线程,定期检查并执行到期任务"""
        def poll_tasks():
            while self.running:
                try:
                    # 每30秒检查一次数据库
                    time.sleep(30)
                    
                    if not self.running:
                        break
                    
                    # 检查数据库中的任务状态变化（启用/禁用）
                    self._sync_tasks_from_db()
                    
                    # 执行所有到期的任务
                    self._execute_due_tasks()
                    
                except Exception as e:
                    self.log.write_log(f"轮询任务失败: {str(e)}", 'error')
        
        # 创建守护线程
        polling_thread = threading.Thread(target=poll_tasks, daemon=True)
        polling_thread.start()
        self.log.write_log("任务轮询线程已启动,每30秒检查一次到期任务", 'info')
    
    def _sync_tasks_from_db(self):
        """从数据库同步任务状态"""
        try:
            db = Date_base()
            
            # 查询所有 status='1' 且 key2='auto_manager' 的任务
            query_sql = """
            SELECT dataID, dataName, key1, value 
            FROM config 
            WHERE key2 = 'auto_manager' AND status = '1'
            """
            
            success, results = db.select(query_sql)
            
            if not success or not results:
                return
            
            db_task_ids = set()
            
            # 检查需要启动的任务
            for row in results:
                task_id = row[0]
                task_name = row[1]
                automate_type = row[2]
                
                try:
                    config = json.loads(row[3]) if row[3] else {}
                    db_task_ids.add(task_id)
                    
                    # 如果任务不在运行中,启动它
                    if task_id not in self.tasks:
                        self.log.write_log(f"检测到新启用的任务: {task_name} (ID: {task_id})", 'info')
                        self.start_task(task_id, task_name, automate_type, config)
                        
                except json.JSONDecodeError as e:
                    self.log.write_log(f"解析任务配置失败 (taskId={task_id}): {e}", 'error')
                    continue
            
            # 检查需要停止的任务
            with self.lock:
                current_task_ids = list(self.tasks.keys())
                
            for task_id in current_task_ids:
                if task_id not in db_task_ids:
                    self.log.write_log(f"检测到任务被禁用或删除 (ID: {task_id})", 'info')
                    self.stop_task(task_id)
                    
        except Exception as e:
            self.log.write_log(f"同步任务状态失败: {str(e)}", 'error')
    
    def _execute_due_tasks(self):
        """执行所有到期的任务"""
        try:
            db = Date_base()
            
            # 查询所有启用的任务
            query_sql = """
            SELECT dataID, dataName, key1, value 
            FROM config 
            WHERE key2 = 'auto_manager' AND status = '1'
            """
            
            success, results = db.select(query_sql)
            
            if not success or not results:
                return
            
            # 收集所有需要执行的任务
            due_tasks = []
            now = datetime.now()
            
            for row in results:
                task_id = row[0]
                task_name = row[1]
                automate_type = row[2]
                
                try:
                    config = json.loads(row[3]) if row[3] else {}
                    next_run_str = config.get('nextRun')

                    # 检查是否到期
                    if next_run_str:
                        next_run_time = datetime.strptime(next_run_str, '%Y-%m-%d %H:%M:%S')

                        # 如果当前时间已经超过或等于 nextRun 时间，则需要执行
                        if now >= next_run_time:
                            # 数据源未启用时跳过本次执行，推迟到下个周期再检查
                            is_valid, reason = self._validate_task_source_enabled(automate_type, config)
                            if not is_valid:
                                self.log.write_log(
                                    f"任务依赖数据源未启用，跳过本次执行: {task_name} (ID: {task_id})，原因: {reason}",
                                    'warning'
                                )
                                self._update_task_execution_time(task_id, executed=False)
                                continue
                            due_tasks.append({
                                'task_id': task_id,
                                'task_name': task_name,
                                'automate_type': automate_type,
                                'config': config,
                                'next_run': next_run_str
                            })
                    
                except (json.JSONDecodeError, ValueError) as e:
                    self.log.write_log(f"解析任务配置失败 (taskId={task_id}): {e}", 'error')
                    continue
            
            # 如果有到期的任务，逐个执行
            if due_tasks:
                self.log.write_log(f"发现 {len(due_tasks)} 个到期任务，开始执行", 'info')
                
                for task in due_tasks:
                    try:
                        # 尝试获取执行锁（阻塞等待，直到可以执行）
                        self.execution_lock.acquire()

                        # 记录开始执行
                        with self.lock:
                            self.currently_executing[task['task_id']] = {
                                'task_name': task['task_name'],
                                'automate_type': task['automate_type'],
                                'start_time': datetime.now(),
                                'config': task['config']
                            }

                        self.log.write_log(
                            f"开始执行到期任务: {task['task_name']} (ID: {task['task_id']}, 计划时间: {task['next_run']})",
                            'info'
                        )

                        # 执行任务
                        self._execute_task(task)

                        # 更新执行时间
                        self._update_task_execution_time(task['task_id'])

                        self.log.write_log(f"任务 {task['task_name']} 执行完成", 'info')

                    except Exception as e:
                        self.log.write_log(f"执行任务失败 ({task['task_name']}): {str(e)}", 'error')
                    finally:
                        # 移除执行记录
                        with self.lock:
                            self.currently_executing.pop(task['task_id'], None)

                        # 释放执行锁
                        self.execution_lock.release()
                
                self.log.write_log(f"所有到期任务执行完毕，共 {len(due_tasks)} 个", 'info')
            
        except Exception as e:
            self.log.write_log(f"检查到期任务失败: {str(e)}", 'error')
        
    def load_and_start_tasks(self):
        """从数据库加载并启动所有已启用的任务"""
        try:
            db = Date_base()
            
            # 查询所有启用的任务
            query_sql = """
            SELECT dataID, dataName, key1, value 
            FROM config 
            WHERE key2 = 'auto_manager' AND status = '1'
            """
            
            success, results = db.select(query_sql)
            
            if success and results:
                for row in results:
                    task_id = row[0]
                    task_name = row[1]
                    automate_type = row[2]
                    
                    try:
                        config = json.loads(row[3]) if row[3] else {}
                        
                        # 启动任务
                        self.start_task(task_id, task_name, automate_type, config)
                        
                    except json.JSONDecodeError as e:
                        self.log.write_log(f"解析任务配置失败 (taskId={task_id}): {e}", 'error')
                        continue
                
                self.log.write_log(f"已加载 {len(self.tasks)} 个定时任务", 'info')
            else:
                self.log.write_log("没有找到启用的定时任务", 'info')
                
        except Exception as e:
            self.log.write_log(f"加载定时任务失败: {str(e)}", 'error')
    
    def start_task(self, task_id, task_name, automate_type, config):
        """注册任务到调度器（轮询模式不需要创建Timer）
        
        Args:
            task_id: 任务ID
            task_name: 任务名称
            automate_type: 自动化类型
            config: 任务配置
        """
        with self.lock:
            # 如果任务已存在，更新配置
            if task_id in self.tasks:
                self.tasks[task_id].update({
                    'task_name': task_name,
                    'automate_type': automate_type,
                    'config': config
                })
                self.log.write_log(f"任务已更新: {task_name} (ID: {task_id})", 'info')
            else:
                # 创建新任务
                self.tasks[task_id] = {
                    'task_id': task_id,
                    'task_name': task_name,
                    'automate_type': automate_type,
                    'config': config
                }
                self.log.write_log(f"任务已注册到调度器: {task_name} (ID: {task_id})", 'info')
    
    
    def stop_task(self, task_id):
        """从调度器移除任务"""
        with self.lock:
            if task_id in self.tasks:
                task_name = self.tasks[task_id].get('task_name', 'Unknown')
                del self.tasks[task_id]
                self.log.write_log(f"任务已从调度器移除: {task_name} (ID: {task_id})", 'info')
            else:
                self.log.write_log(f"任务不存在 (taskId={task_id})", 'info')
    
    def reload_task(self, task_id):
        """重新加载单个任务(用于更新任务配置)"""
        try:
            db = Date_base()
            
            query_sql = f"""
            SELECT dataName, key1, value, status 
            FROM config 
            WHERE dataID = {task_id} AND key2 = 'auto_manager'
            """
            
            success, result = db.select(query_sql)
            
            if success and result:
                row = result[0]
                task_name = row[0]
                automate_type = row[1]
                config = json.loads(row[2]) if row[2] else {}
                enabled = row[3] == '1'
                
                # 先停止任务
                self.stop_task(task_id)
                
                # 如果启用,重新启动
                if enabled:
                    self.start_task(task_id, task_name, automate_type, config)
                    
        except Exception as e:
            self.log.write_log(f"重新加载任务失败 (taskId={task_id}): {str(e)}", 'error')
    
    def _update_task_execution_time(self, task_id, executed=True):
        """更新任务执行时间到数据库(存储在value JSON中)

        executed=False 时仅推迟 nextRun，不更新 lastRun(用于数据源未启用时跳过执行)
        """
        try:
            from datetime import datetime, timedelta
            
            db = Date_base()
            
            # 获取当前配置
            query_sql = f"SELECT value FROM config WHERE dataID = {task_id} AND key2 = 'auto_manager'"
            success, result = db.select(query_sql)
            
            if success and result and result[0][0]:
                # 解析现有配置
                current_config = json.loads(result[0][0])
                
                # 获取间隔时间
                interval = current_config.get('interval', 30)
                
                # 计算时间
                now = datetime.now()
                next_run = (now + timedelta(minutes=interval)).strftime('%Y-%m-%d %H:%M:%S')

                # 更新执行时间
                if executed:
                    current_config['lastRun'] = now.strftime('%Y-%m-%d %H:%M:%S')
                current_config['nextRun'] = next_run
                
                # 保存回数据库
                config_json = json.dumps(current_config, ensure_ascii=False).replace("'", "''")
                update_sql = f"""
                UPDATE config 
                SET value = '{config_json}' 
                WHERE dataID = {task_id} AND key2 = 'auto_manager'
                """
                
                db.update(update_sql)
                
                self.log.write_log(f"任务执行时间已更新 (ID: {task_id}): lastRun={current_config.get('lastRun')}, nextRun={next_run}", 'info')
            
        except Exception as e:
            self.log.write_log(f"更新任务执行时间失败 (taskId={task_id}): {str(e)}", 'error')
    
    def _execute_task(self, task_info):
        """执行具体任务"""
        task_id = task_info['task_id']
        task_name = task_info['task_name']
        automate_type = task_info['automate_type']
        config = task_info['config']

        self.log.write_log(f"开始执行任务: {task_name} (ID: {task_id})", 'info')

        try:
            if automate_type == 'auto_update':
                # 自动更新数据任务
                self._execute_update_task(task_info)
            elif automate_type == 'auto_fetch':
                # 自动获取数据任务
                self._execute_fetch_task(task_info)
            elif automate_type == 'auto_platform_price':
                # 更新饰品平台价格
                self._execute_platform_price_task(task_info)
            elif automate_type == 'auto_search_weapon':
                # 自动搜索饰品任务
                self._execute_search_weapon_task(task_info)
            elif automate_type == 'auto_refresh_auth':
                # 更新Steam认证
                self._execute_refresh_auth_task(task_info)
            elif automate_type == 'auto_stock_price':
                # 独立更新任务：更新库存组件平台价格（对全部账号执行）
                self._execute_stock_price_task(task_info)
            else:
                self.log.write_log(f"未知的任务类型: {automate_type}", 'error')

        except Exception as e:
            self.log.write_log(f"任务执行异常 ({task_name}): {str(e)}", 'error')
    
    def _execute_update_task(self, task_info):
        """执行更新类任务"""
        config = task_info['config']
        selected_task = config.get('selectedTask')
        
        # 获取Steam配置ID（新版本）或直接的Steam ID（旧版本兼容）
        steam_config_id = config.get('selectedSteamConfig')
        steam_id = config.get('selectedSteamId')  # 兼容旧版本
        
        # 如果有steam_config_id，从数据库查询对应的steamID
        # 不同的任务类型从不同的数据源获取配置
        if steam_config_id:
            try:
                db = Date_base()
                
                # 根据任务类型确定查询条件
                if selected_task == 'update_steam_inventory':
                    # 更新Steam库存 - 从 key1='steam' 的配置获取
                    query_sql = f"""
                    SELECT steamID 
                    FROM config 
                    WHERE dataID = {steam_config_id} AND key1 = 'steam' AND key2 = 'config'
                    """
                elif selected_task == 'fetch_yyyp_price':
                    # 获取悠悠有品价格 - 从 key1='youpin' 的配置获取
                    query_sql = f"""
                    SELECT steamID 
                    FROM config 
                    WHERE dataID = {steam_config_id} AND key1 = 'youpin' AND key2 = 'config'
                    """
                elif selected_task == 'fetch_buff_price':
                    # 获取BUFF价格 - 从 key1='buff' 的配置获取
                    query_sql = f"""
                    SELECT steamID 
                    FROM config 
                    WHERE dataID = {steam_config_id} AND key1 = 'buff' AND key2 = 'config'
                    """
                else:
                    self.log.write_log(f"未知的任务类型: {selected_task}", 'error')
                    return
                
                success, result = db.select(query_sql)
                
                if success and result and result[0][0]:
                    steam_id = result[0][0]
                    self.log.write_log(f"从配置ID {steam_config_id} 获取到 Steam ID: {steam_id}", 'info')
                else:
                    self.log.write_log(f"未找到配置ID {steam_config_id} 对应的Steam ID", 'error')
                    return
            except Exception as e:
                self.log.write_log(f"查询Steam ID失败: {str(e)}", 'error')
                return
        
        if not steam_id:
            self.log.write_log(f"任务 {task_info['task_name']} 缺少 Steam ID", 'error')
            return
        
        # 根据任务类型调用相应的API (与前端 Inventory.vue 保持一致)
        spider_base_url = "http://127.0.0.1:9002"  # Spider服务地址
        
        try:
            if selected_task == 'update_steam_inventory':
                # 更新Steam库存 - 调用Spider接口，与前端Inventory页面逻辑一致
                self.log.write_log(f"开始更新Steam库存: {steam_id}", 'info')
                response = requests.post(
                    f"{spider_base_url}/spiderApiV2/src/web_site/steam/units/inventory/getInventory",
                    json={'steamId': steam_id},
                    timeout=300  # 5分钟超时
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('success'):
                        self.log.write_log(f"更新Steam库存成功: {steam_id}, 消息: {response_data.get('message', '')}", 'info')
                    else:
                        self.log.write_log(f"更新Steam库存失败: {steam_id}, 消息: {response_data.get('message', '')}", 'error')
                else:
                    self.log.write_log(f"更新Steam库存HTTP错误: {steam_id}, 状态码: {response.status_code}", 'error')
                
            elif selected_task == 'fetch_yyyp_price':
                # 获取悠悠有品价格 - 与前端 Inventory.vue 的 fetchYYYPPrice 方法一致
                self.log.write_log(f"开始获取悠悠有品价格: {steam_id}", 'info')
                response = requests.post(
                    f"{spider_base_url}/spiderApiV2/src/web_site/youping/units/settings/dev_tools/syncWeaponPrice",
                    json={'steamId': steam_id},
                    timeout=300
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('success'):
                        self.log.write_log(f"获取悠悠有品价格成功: {steam_id}, 消息: {response_data.get('message', '')}", 'info')
                    else:
                        self.log.write_log(f"获取悠悠有品价格失败: {steam_id}, 消息: {response_data.get('message', '')}", 'error')
                else:
                    self.log.write_log(f"获取悠悠有品价格HTTP错误: {steam_id}, 状态码: {response.status_code}", 'error')
                
            elif selected_task == 'fetch_buff_price':
                # 获取BUFF价格 - 与前端 Inventory.vue 的 fetchBuffPrice 方法一致
                self.log.write_log(f"开始获取BUFF价格: {steam_id}", 'info')
                response = requests.post(
                    f"{spider_base_url}/spiderApiV2/src/web_site/buff/units/inventory/getBUFFPrice",
                    json={'steamId': steam_id},
                    timeout=300
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('success'):
                        self.log.write_log(f"获取BUFF价格成功: {steam_id}, 消息: {response_data.get('message', '')}", 'info')
                    else:
                        self.log.write_log(f"获取BUFF价格失败: {steam_id}, 消息: {response_data.get('message', '')}", 'error')
                else:
                    self.log.write_log(f"获取BUFF价格HTTP错误: {steam_id}, 状态码: {response.status_code}", 'error')
                
        except requests.exceptions.Timeout:
            self.log.write_log(f"任务执行超时: {task_info['task_name']}, Steam ID: {steam_id}", 'error')
        except requests.exceptions.RequestException as e:
            self.log.write_log(f"API请求失败: {task_info['task_name']}, Steam ID: {steam_id}, 错误: {str(e)}", 'error')
        except Exception as e:
            self.log.write_log(f"执行任务异常: {task_info['task_name']}, 错误: {str(e)}", 'error')
    
    def _execute_fetch_task(self, task_info):
        """执行数据采集类任务"""
        config = task_info['config']
        selected_task = config.get('selectedTask')
        data_source_id = config.get('selectedDataSource')
        
        if not data_source_id:
            self.log.write_log(f"任务 {task_info['task_name']} 没有选择数据源", 'error')
            return
        
        # 获取数据源配置
        db = Date_base()
        
        try:
            # 查询数据源配置
            query_sql = f"""
            SELECT dataName, key1, value, steamID 
            FROM config 
            WHERE dataID = {data_source_id} AND key2 = 'config'
            """
            
            success, result = db.select(query_sql)
            
            if not success or not result:
                self.log.write_log(f"数据源不存在: ID={data_source_id}", 'error')
                return
            
            data_name = result[0][0]
            data_type = result[0][1]
            config_json = json.loads(result[0][2]) if result[0][2] else {}
            steam_id = result[0][3]
            
            # 根据任务类型和数据源类型执行采集
            spider_base_url = "http://127.0.0.1:9002"  # Spider服务地址
            
            if selected_task == 'collect_buff' and data_type == 'buff':
                # 采集BUFF数据
                url = f"{spider_base_url}/spiderApiV2/src/web_site/buff/units/settings/data_source/syncNewData"
                data = {'steamID': steam_id}
                self.log.write_log(f"请求BUFF采集 - URL: {url}, 数据: {data}", 'info')
                
                response = requests.post(url, json=data, timeout=600)
                
                self.log.write_log(f"BUFF数据采集完成: {data_name}, 状态: {response.status_code}, 响应: {response.text[:200]}", 'info')
                
            elif selected_task == 'collect_youpin' and data_type == 'youpin':
                # 采集悠悠有品数据（只需要传递steamId，后端会根据steamId获取完整配置）
                url = f"{spider_base_url}/spiderApiV2/src/web_site/youping/units/settings/data_source/syncNewData"
                data = {'steamId': steam_id}
                self.log.write_log(f"请求悠悠有品采集 - URL: {url}, 数据: {data}", 'info')
                
                response = requests.post(url, json=data, timeout=600)
                
                self.log.write_log(f"悠悠有品数据采集完成: {data_name}, 状态: {response.status_code}, 响应: {response.text[:200]}", 'info')
                
        except requests.exceptions.Timeout:
            self.log.write_log(f"数据采集超时", 'error')
        except requests.exceptions.RequestException as e:
            self.log.write_log(f"数据采集失败: {str(e)}", 'error')
        except Exception as e:
            self.log.write_log(f"处理数据源失败 (ID={data_source_id}): {str(e)}", 'error')

    def _execute_platform_price_task(self, task_info):
        """执行饰品平台价格更新任务"""
        config = task_info['config']
        selected_task = config.get('selectedTask')
        data_source_id = config.get('selectedDataSource')
        sync_history = config.get('syncHistory', True)  # 默认同步历史数据

        if not data_source_id:
            self.log.write_log(f"任务 {task_info['task_name']} 没有选择数据源", 'error')
            return

        db = Date_base()

        try:
            query_sql = f"""
            SELECT dataName, key1, value, steamID
            FROM config
            WHERE dataID = {data_source_id} AND key2 = 'config'
            """
            success, result = db.select(query_sql)

            if not success or not result:
                self.log.write_log(f"数据源不存在: ID={data_source_id}", 'error')
                return

            data_name = result[0][0]
            data_type = result[0][1]
            steam_id = result[0][3]

            if not steam_id:
                self.log.write_log(f"数据源 {data_name} (ID={data_source_id}) 缺少 Steam ID", 'error')
                return

            spider_base_url = "http://127.0.0.1:9002"

            if selected_task == 'platform_youpin_price':
                if data_type != 'youpin':
                    self.log.write_log(f"数据源类型与任务不匹配: 期望youpin, 实际 {data_type}", 'warning')
                    return

                url = f"{spider_base_url}/spiderApiV2/src/web_site/youping/units/settings/dev_tools/syncWeaponTemplates"
                payload = {'steamId': steam_id, 'syncHistory': sync_history}
                self.log.write_log(f"开始更新悠悠有品饰品价格: {data_name}, URL: {url}, syncHistory: {sync_history}", 'info')
                response = requests.post(url, json=payload, timeout=600)
                self.log.write_log(f"悠悠有品饰品价格更新完成: 状态 {response.status_code}, 响应: {response.text[:200]}", 'info')
            
            elif selected_task == 'platform_buff_price':
                if data_type != 'buff':
                    self.log.write_log(f"数据源类型与任务不匹配: 期望buff, 实际 {data_type}", 'warning')
                    return
                
                url = f"{spider_base_url}/spiderApiV2/src/web_site/buff/units/settings/dev_tools/syncBuffTemplates"
                payload = {'steamId': steam_id}
                self.log.write_log(f"开始更新BUFF饰品价格: {data_name}, URL: {url}", 'info')
                response = requests.post(url, json=payload, timeout=600)
                self.log.write_log(f"BUFF饰品价格更新完成: 状态 {response.status_code}, 响应: {response.text[:200]}", 'info')
            else:
                self.log.write_log(f"未知的平台价格任务类型: {selected_task}", 'error')
        
        except requests.exceptions.Timeout:
            self.log.write_log(f"平台价格更新超时 (数据源ID={data_source_id})", 'error')
        except requests.exceptions.RequestException as e:
            self.log.write_log(f"平台价格更新失败: {str(e)}", 'error')
        except Exception as e:
            self.log.write_log(f"平台价格任务处理失败 (ID={data_source_id}): {str(e)}", 'error')

    def _execute_search_weapon_task(self, task_info):
        """执行自动搜索饰品任务"""
        config = task_info['config']
        selected_task = config.get('selectedTask')
        search_config_id = config.get('selectedSearchConfig')

        if not search_config_id:
            self.log.write_log(f"任务 {task_info['task_name']} 未配置搜索配置ID", 'error')
            return

        if selected_task == 'search_weapon_rename':
            key1 = 'spider_rename'
            endpoint = '/spiderApiV2/src/web_site/youping/auto_weapon/autoBuyRenamedWeapon'
            task_desc = '改名饰品搜索'
        elif selected_task == 'search_weapon_pendant':
            key1 = 'spider_pendant'
            endpoint = '/spiderApiV2/src/web_site/youping/auto_weapon/autoBuyPendantWeapon'
            task_desc = '挂件饰品搜索'
        else:
            self.log.write_log(f"未知的搜索任务类型: {selected_task}", 'error')
            return

        db = Date_base()
        try:
            query_sql = f"""
            SELECT dataName, value
            FROM config
            WHERE dataID = {search_config_id} AND key1 = '{key1}'
            """
            success, result = db.select(query_sql)

            if not success or not result:
                self.log.write_log(f"搜索配置不存在: ID={search_config_id}, key1={key1}", 'error')
                return

            config_name = result[0][0]
            config_value = json.loads(result[0][1]) if result[0][1] else {}

            spider_config = config_value
            steam_id = spider_config.get('crawl_account_id') or spider_config.get('steam_id') or spider_config.get('steamId')

            if not steam_id:
                self.log.write_log(f"搜索配置 {config_name} 缺少爬取账号", 'error')
                return

            weapon_list = spider_config.get('weapon_id') or []
            if not weapon_list:
                self.log.write_log(f"搜索配置 {config_name} 未配置监控的饰品ID", 'error')
                return

            spider_base_url = "http://127.0.0.1:9002"
            url = f"{spider_base_url}{endpoint}"
            payload = {
                'steamId': steam_id,
                'spider_config': spider_config
            }

            self.log.write_log(f"开始执行{task_desc}: 配置={config_name}, URL={url}", 'info')
            response = requests.post(url, json=payload, timeout=600)

            if response.status_code == 200:
                try:
                    response_data = response.json()
                except ValueError:
                    response_data = {}

                if response_data.get('success'):
                    self.log.write_log(f"{task_desc}任务启动成功: 配置={config_name}", 'info')
                else:
                    self.log.write_log(f"{task_desc}任务启动失败: 配置={config_name}, 消息={response_data.get('message', '')}", 'error')
            else:
                self.log.write_log(f"{task_desc}HTTP错误: 配置={config_name}, 状态码={response.status_code}", 'error')

        except requests.exceptions.Timeout:
            self.log.write_log(f"{task_desc}任务请求超时: 配置ID={search_config_id}", 'error')
        except requests.exceptions.RequestException as e:
            self.log.write_log(f"{task_desc}任务请求失败: {str(e)}", 'error')
        except Exception as e:
            self.log.write_log(f"{task_desc}任务处理失败: {str(e)}", 'error')

    def _execute_refresh_auth_task(self, task_info):
        """执行更新Steam认证任务"""
        config = task_info['config']

        # 获取Steam配置ID
        steam_config_id = config.get('selectedSteamConfig')
        steam_id = config.get('selectedSteamId')  # 兼容旧版本

        # 如果有steam_config_id，从数据库查询对应的steamID
        if steam_config_id:
            try:
                db = Date_base()

                # 从 key1='steam' 的配置获取
                query_sql = f"""
                SELECT steamID
                FROM config
                WHERE dataID = {steam_config_id} AND key1 = 'steam' AND key2 = 'config'
                """

                success, result = db.select(query_sql)

                if success and result and result[0][0]:
                    steam_id = result[0][0]
                    self.log.write_log(f"从配置ID {steam_config_id} 获取到 Steam ID: {steam_id}", 'info')
                else:
                    self.log.write_log(f"未找到配置ID {steam_config_id} 对应的Steam ID", 'error')
                    return
            except Exception as e:
                self.log.write_log(f"查询Steam ID失败: {str(e)}", 'error')
                return

        if not steam_id:
            self.log.write_log(f"任务 {task_info['task_name']} 缺少 Steam ID", 'error')
            return

        # 调用Steam认证刷新API
        spider_base_url = "http://127.0.0.1:9002"  # Spider服务地址

        try:
            self.log.write_log(f"开始更新Steam认证: {steam_id}", 'info')
            response = requests.post(
                f"{spider_base_url}/spiderApiV2/src/web_site/steam/units/settings/data_source/auth/refresh_auto",
                json={'steam_id': steam_id},
                timeout=120  # 2分钟超时
            )

            if response.status_code == 200:
                try:
                    response_data = response.json()
                except ValueError:
                    response_data = {}

                if response_data.get('success'):
                    message = response_data.get('message', 'Steam认证更新成功')
                    self.log.write_log(f"Steam认证更新成功: {steam_id}, 消息: {message}", 'info')
                else:
                    message = response_data.get('message', '未知错误')
                    self.log.write_log(f"Steam认证更新失败: {steam_id}, 原因: {message}", 'error')
            else:
                self.log.write_log(f"Steam认证更新HTTP错误: {steam_id}, 状态码: {response.status_code}", 'error')

        except requests.exceptions.Timeout:
            self.log.write_log(f"Steam认证更新请求超时: {steam_id}", 'error')
        except requests.exceptions.RequestException as e:
            self.log.write_log(f"Steam认证更新请求失败: {steam_id}, 错误: {str(e)}", 'error')
        except Exception as e:
            self.log.write_log(f"Steam认证更新异常: {steam_id}, 错误: {str(e)}", 'error')

    def _execute_stock_price_task(self, task_info):
        """执行独立更新任务：更新库存组件平台价格，对全部已配置 Steam 账号依次执行

        config.source: 'database' (从数据库同步 悠悠+BUFF) 或 'csqaq' (从 CSQAQ 获取)
        """
        config = task_info['config']
        source = (config.get('source') or 'database').lower()

        db = Date_base()

        # 枚举所有已配置的 Steam 账号
        try:
            query_sql = """
            SELECT DISTINCT steamID
            FROM config
            WHERE key1 = 'steam' AND key2 = 'config'
              AND steamID IS NOT NULL AND steamID != ''
            """
            success, result = db.select(query_sql)
        except Exception as e:
            self.log.write_log(f"更新平台价格：查询Steam账号失败: {str(e)}", 'error')
            return

        if not success or not result:
            self.log.write_log("更新平台价格：未找到任何已配置的Steam账号", 'warning')
            return

        steam_ids = [row[0] for row in result if row[0]]
        self.log.write_log(f"更新平台价格：共 {len(steam_ids)} 个账号，数据来源={source}", 'info')

        backend_base = "http://127.0.0.1:9001"  # 后端服务（自身）
        spider_base = "http://127.0.0.1:9002"   # Spider 服务

        for steam_id in steam_ids:
            try:
                if source == 'csqaq':
                    url = f"{spider_base}/spiderApiV2/src/web_site/csqaq/units/QAQ_API/stock_components/updatePricesFromCsqaq"
                    response = requests.post(url, json={'steam_id': steam_id}, timeout=600)
                    self.log.write_log(
                        f"CSQAQ平台价格更新完成: {steam_id}, 状态 {response.status_code}, 响应: {response.text[:150]}",
                        'info'
                    )
                else:
                    for platform in ['yyyp', 'buff']:
                        url = f"{backend_base}/backENDV2/src/use_webside/stock_components/units/price/fillReferencePrice/{steam_id}/{platform}"
                        response = requests.post(url, json={'force_update': True}, timeout=600)
                        self.log.write_log(
                            f"数据库平台价格更新({platform})完成: {steam_id}, 状态 {response.status_code}",
                            'info'
                        )
            except requests.exceptions.Timeout:
                self.log.write_log(f"平台价格更新超时: {steam_id}", 'error')
            except requests.exceptions.RequestException as e:
                self.log.write_log(f"平台价格更新请求失败: {steam_id}, 错误: {str(e)}", 'error')
            except Exception as e:
                self.log.write_log(f"平台价格更新异常: {steam_id}, 错误: {str(e)}", 'error')

    def get_currently_executing_tasks(self):
        """获取正在执行的任务列表"""
        with self.lock:
            result = []
            for task_id, task_info in self.currently_executing.items():
                result.append({
                    'taskId': task_id,
                    'taskName': task_info['task_name'],
                    'automateType': task_info['automate_type'],
                    'startTime': task_info['start_time'].strftime('%Y-%m-%d %H:%M:%S'),
                    'duration': (datetime.now() - task_info['start_time']).total_seconds(),
                    'config': task_info['config']
                })
            return result


# 全局调度器实例
_scheduler = None

def get_scheduler():
    """获取全局调度器实例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = TaskScheduler()
    return _scheduler

