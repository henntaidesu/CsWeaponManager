"""
Charles证书管理器
用于安装和管理Charles代理证书
"""

import os
import hashlib
import tempfile
from typing import Optional
from .adb_manager import ADBManager
from .charles_cert import CHARLES_CERT


class CharlesCertManager:
    """Charles证书管理器"""

    CHARLES_CERT = CHARLES_CERT

    def __init__(self, adb_manager: Optional[ADBManager] = None):
        """
        初始化证书管理器
        
        Args:
            adb_manager: ADB管理器实例，如果为None则创建新实例
        """
        self.adb = adb_manager if adb_manager else ADBManager()
        self.cert_hash = None
        self.temp_cert_path = None
        
    def _calculate_cert_hash(self) -> str:
        """
        计算证书的hash值（Android系统证书命名规则）
        使用OpenSSL的subject_hash_old算法（纯Python实现）
        
        Returns:
            str: 证书hash值
            
        Raises:
            Exception: 如果计算失败
        """
        try:
            from cryptography import x509
            from cryptography.hazmat.backends import default_backend
            import hashlib
            
            # 解析证书
            cert = x509.load_pem_x509_certificate(
                self.CHARLES_CERT.encode(),
                default_backend()
            )
            
            # 获取Subject的DER编码（这是OpenSSL subject_hash_old使用的）
            subject_der = cert.subject.public_bytes(default_backend())
            
            # 使用MD5计算hash（OpenSSL subject_hash_old使用MD5）
            md5_hash = hashlib.md5(subject_der).digest()
            
            # 转换为OpenSSL格式的hash（取前4字节，小端序）
            hash_value = int.from_bytes(md5_hash[:4], byteorder='little')
            hash_str = f"{hash_value:08x}"
            
            print(f"✓ 计算的证书hash: {hash_str}")
            return hash_str
            
        except Exception as e:
            print(f"计算证书hash失败: {e}")
            import traceback
            print(traceback.format_exc())
            raise Exception(f"计算证书hash失败: {str(e)}")
    
    def _create_temp_cert_file(self) -> str:
        """
        创建临时证书文件
        
        Returns:
            str: 临时文件路径
        """
        if self.temp_cert_path and os.path.exists(self.temp_cert_path):
            return self.temp_cert_path
        
        # 计算证书hash
        self.cert_hash = self._calculate_cert_hash()
        
        # 创建临时文件
        temp_dir = tempfile.gettempdir()
        cert_filename = f"{self.cert_hash}.0"
        self.temp_cert_path = os.path.join(temp_dir, cert_filename)
        
        # 写入证书内容
        with open(self.temp_cert_path, 'w', encoding='utf-8') as f:
            f.write(self.CHARLES_CERT)
        
        print(f"临时证书文件已创建: {self.temp_cert_path}")
        return self.temp_cert_path
    
    def _cleanup_temp_file(self):
        """清理临时证书文件"""
        if self.temp_cert_path and os.path.exists(self.temp_cert_path):
            try:
                os.remove(self.temp_cert_path)
                print(f"临时证书文件已删除: {self.temp_cert_path}")
            except Exception as e:
                print(f"删除临时文件失败: {e}")
    
    def check_cert_installed(self) -> bool:
        """
        检查证书是否已安装
        
        Returns:
            bool: 证书是否已安装
        """
        if not self.adb.device:
            print("未选择设备")
            return False
        
        self.cert_hash = self._calculate_cert_hash()
        cert_filename = f"{self.cert_hash}.0"
        
        # 可能的证书目录列表（不同Android版本可能不同）
        cert_paths = [
            f"/system/etc/security/cacerts/{cert_filename}",
            f"/apex/com.android.conscrypt/cacerts/{cert_filename}",  # Android 14+
            f"/data/misc/user/0/cacerts-added/{cert_filename}",  # 用户证书
        ]
        
        for cert_path in cert_paths:
            # 使用 test 命令检查文件是否存在（更可靠）
            # 对于系统目录，需要使用 su -c 来获取root权限
            if '/system/' in cert_path or '/apex/' in cert_path:
                success, result = self.adb.execute_shell(f"su -c 'test -f {cert_path} && echo EXISTS || echo NOT_EXISTS'")
            else:
                success, result = self.adb.execute_shell(f"test -f {cert_path} && echo 'EXISTS' || echo 'NOT_EXISTS'")
            
            if success and 'EXISTS' in result and 'NOT_EXISTS' not in result:
                print(f"证书已安装: {cert_filename} (位置: {cert_path})")
                return True
        
        print(f"证书未安装")
        return False
    
    def install_cert(self, force: bool = False) -> bool:
        """
        安装Charles证书到Android设备
        
        Args:
            force: 是否强制重新安装
            
        Returns:
            bool: 是否安装成功
        """
        if not self.adb.device:
            print("错误: 未选择设备")
            return False
        
        # 检查设备信息
        device_info = self.adb.get_device_info()
        print(f"设备信息: {device_info}")
        
        # 检查并请求root权限
        if not device_info.get('is_root', False):
            print("设备未检测到root权限，尝试主动请求...")
            if not self.adb.request_root():
                print("✗ 无法获取root权限，证书安装需要root权限")
                return False
        else:
            print("✓ 设备已有root权限")
        
        # 检查是否已安装
        if self.check_cert_installed():
            if not force:
                print("证书已存在，跳过安装。如需重新安装，请使用 force=True")
                return True
            else:
                print("证书已存在，但设置了force=True，将强制重新安装...")
        
        try:
            # 1. 创建临时证书文件
            local_cert_path = self._create_temp_cert_file()
            cert_filename = f"{self.cert_hash}.0"
            
            # 2. 先推送证书到临时目录
            temp_remote_path = f"/sdcard/{cert_filename}"
            print(f"推送证书到临时目录: {temp_remote_path}")
            if not self.adb.push_file(local_cert_path, temp_remote_path):
                print("✗ 推送证书到临时目录失败")
                return False
            
            # 验证文件是否成功推送
            success, result = self.adb.execute_shell(f"ls -la {temp_remote_path}")
            print(f"临时文件状态: {result}")
            if "No such file" in result:
                print("✗ 证书文件推送失败")
                return False
            
            # 3. 使用su -c cp命令复制到系统目录（绕过挂载限制）
            target_path = f"/system/etc/security/cacerts/{cert_filename}"
            print(f"\n使用su权限复制证书到系统目录: {target_path}")
            
            # 先删除旧文件（如果存在）
            self.adb.execute_shell(f"su -c 'rm -f {target_path}'")
            
            # 使用cp命令复制（某些设备即使系统分区只读也可以通过su -c cp成功）
            success, result = self.adb.execute_shell(
                f"su -c 'cp {temp_remote_path} {target_path} 2>&1'"
            )
            print(f"复制命令执行结果: {result if result.strip() else '(无输出，可能成功)'}")
            
            # 检查是否是只读文件系统错误
            if "Read-only file system" in result:
                # 清理临时文件
                self.adb.execute_shell(f"rm {temp_remote_path}")
                
                print("\n✗ 系统分区为只读，无法复制证书")
                print("\n⚠ 重要提示：MuMu模拟器需要开启'可选系统盘'功能！")
                print("\n请按以下步骤操作:")
                print("  1. 打开MuMu模拟器")
                print("  2. 点击右上角的'设置'按钮（齿轮图标）")
                print("  3. 在设置中心找到'可选系统盘'选项")
                print("  4. 勾选'可选系统盘'")
                print("  5. 点击'保存设置'")
                print("  6. 重启MuMu模拟器")
                print("  7. 重启后，重新连接设备并再次点击'安装证书'")
                print("\n参考文档: https://mumu.163.com/mac/tutorials/certificates-and-packet-capture.html")
                return False
            
            # 验证文件是否复制成功
            success, result = self.adb.execute_shell(
                f"su -c 'ls -la {target_path} 2>&1'"
            )
            print(f"目标文件状态: {result}")
            
            if "No such file" not in result and cert_filename in result:
                print("✓ 证书已成功复制到系统目录")
                
                # 设置权限
                print("设置证书权限...")
                self.adb.execute_shell(f"su -c 'chmod 644 {target_path}'")
                self.adb.execute_shell(f"su -c 'chown root:root {target_path}'")
                print("✓ 权限设置完成")
                
                # 清理临时文件
                self.adb.execute_shell(f"rm {temp_remote_path}")
                print(f"✓ 已清理临时文件")
                
                # 验证安装
                import time
                time.sleep(1)
                
                if self.check_cert_installed():
                    print("✓ Charles证书安装成功!")
                    print("提示: 请重启模拟器/设备以使证书生效")
                    return True
                else:
                    print("⚠ 证书文件已复制但验证未通过，可能需要重启设备")
                    return True  # 实际上文件已经复制成功了
            else:
                # 清理临时文件
                self.adb.execute_shell(f"rm {temp_remote_path}")
                
                print("\n✗ 证书复制失败")
                print("\n可能的原因:")
                print("  1. 设备的系统分区被保护为只读（dm-verity或AVB验证）")
                print("  2. su权限不足或被限制")
                print("\n建议解决方案:")
                print("  1. 确保MuMu模拟器已开启'可选系统盘'功能")
                print("     (在MuMu设置中心勾选'可选系统盘'，保存并重启)")
                print("  2. 或者使用Magisk/KernelSU等工具管理系统证书")
                print("  3. 或者参考MuMu官方文档手动安装证书:")
                print("     https://mumu.163.com/mac/tutorials/certificates-and-packet-capture.html")
                return False
                
        except Exception as e:
            print(f"安装证书时发生错误: {e}")
            return False
        finally:
            # 清理临时文件
            self._cleanup_temp_file()
    
    def uninstall_cert(self) -> bool:
        """
        卸载Charles证书
        
        Returns:
            bool: 是否卸载成功
        """
        if not self.adb.device:
            print("错误: 未选择设备")
            return False
        
        if not self.check_cert_installed():
            print("证书未安装，无需卸载")
            return True
        
        try:
            cert_filename = f"{self.cert_hash}.0"
            cert_path = f"/system/etc/security/cacerts/{cert_filename}"
            
            # 1. 挂载系统分区为可写
            print("重新挂载系统分区为可写...")
            success, result = self.adb.execute_shell("su -c 'mount -o remount,rw /system'")
            if not success:
                print(f"挂载失败: {result}")
                return False
            
            # 2. 检查文件是否存在
            success, result = self.adb.execute_shell(f"su -c 'ls -la {cert_path}'")
            print(f"删除前文件状态: {result}")
            
            # 3. 删除证书文件（使用 -f 参数强制删除）
            print("删除证书文件...")
            success, result = self.adb.execute_shell(
                f"su -c 'rm -f {cert_path}'"
            )
            print(f"删除命令执行结果: success={success}, output={result}")
            
            # 4. 再次检查文件是否还存在
            success, result = self.adb.execute_shell(f"su -c 'ls -la {cert_path}'")
            print(f"删除后文件状态: {result}")
            
            # 如果文件仍然存在，说明删除失败
            if "No such file" not in result and cert_filename in result:
                print(f"警告: 文件仍然存在，尝试其他删除方式")
                # 尝试使用 busybox rm
                self.adb.execute_shell(f"su -c 'busybox rm -f {cert_path}'")
                # 或者直接清空文件
                self.adb.execute_shell(f"su -c 'echo \"\" > {cert_path}'")
                self.adb.execute_shell(f"su -c 'rm -f {cert_path}'")
            
            # 5. 重新挂载系统分区为只读
            print("重新挂载系统分区为只读...")
            self.adb.execute_shell("su -c 'mount -o remount,ro /system'")
            
            # 6. 等待一下确保操作生效
            import time
            time.sleep(1)
            
            # 7. 验证卸载
            if not self.check_cert_installed():
                print("✓ Charles证书卸载成功!")
                return True
            else:
                print("✗ 证书卸载验证失败")
                print(f"提示: 某些设备可能需要重启才能完全删除证书")
                return False
                
        except Exception as e:
            print(f"卸载证书时发生错误: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            # 确保系统分区恢复为只读
            try:
                self.adb.execute_shell("su -c 'mount -o remount,ro /system'")
            except:
                pass
    
    def get_cert_info(self) -> dict:
        """
        获取证书信息
        
        Returns:
            dict: 证书信息字典
        """
        self.cert_hash = self._calculate_cert_hash()
        
        return {
            "cert_hash": self.cert_hash,
            "cert_filename": f"{self.cert_hash}.0",
            "installed": self.check_cert_installed(),
            "cert_length": len(self.CHARLES_CERT)
        }

