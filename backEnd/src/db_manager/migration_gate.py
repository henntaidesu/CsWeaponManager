# -*- coding: utf-8 -*-
"""
数据库迁移闸门

迁移期间需要独占数据库：DatabaseManager 单例会被临时指向目标后端，
此时其他线程若继续读写，就会打到还没建好表、还没灌完数据的库上
（表现为大量 "Table 'xxx' doesn't exist"，后台任务的写入也可能被随后的清表抹掉）。

这里提供一个进程内的全局闸门：
- 迁移线程通过 hold() 持有闸门
- 其他线程的数据库操作被 ensure_allowed() 拒绝（快速失败，不阻塞请求线程）
- 后台调度器通过 is_active() 主动跳过本轮任务
- API 层在 before_request 中统一返回 503

只覆盖 backEnd 进程内部：Spider 服务不访问本数据库，无需跨进程加锁。
"""
import threading
import time
from contextlib import contextmanager


class MigrationInProgress(RuntimeError):
    """数据库迁移进行中，当前操作被拒绝"""


class _MigrationGate:
    """迁移闸门（全局单例，见模块底部的 migration_gate）"""

    def __init__(self):
        self._lock = threading.Lock()
        self._owner = None        # 持有闸门的线程 id
        self._started_at = 0.0
        self._note = ''

    def is_active(self) -> bool:
        """当前是否处于迁移（维护）状态"""
        return self._owner is not None

    def status(self) -> dict:
        """闸门状态，用于接口返回和前端提示"""
        active = self._owner is not None
        return {
            'active': active,
            'note': self._note,
            'elapsed': round(time.time() - self._started_at, 1) if active else 0,
        }

    def ensure_allowed(self):
        """非迁移线程在迁移期间访问数据库时抛出异常"""
        owner = self._owner
        if owner is not None and owner != threading.get_ident():
            raise MigrationInProgress(
                f'数据库正在迁移（{self._note}），已暂停其他所有数据库操作，请稍后重试')

    @contextmanager
    def hold(self, note: str = ''):
        """迁移线程持有闸门；退出时无论成功失败都会释放"""
        with self._lock:
            if self._owner is not None:
                raise MigrationInProgress('已有数据库迁移任务在进行中，请等待其完成')
            self._owner = threading.get_ident()
            self._started_at = time.time()
            self._note = note
        try:
            yield
        finally:
            with self._lock:
                self._owner = None
                self._started_at = 0.0
                self._note = ''


migration_gate = _MigrationGate()
