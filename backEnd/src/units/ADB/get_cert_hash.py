"""
获取Charles证书的正确Hash值
用于Android系统证书命名
"""

import subprocess
import tempfile
import os

from .charles_cert import CHARLES_CERT


def get_cert_hash_openssl():
    """使用OpenSSL命令获取证书hash"""
    # 创建临时文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.pem', delete=False) as f:
        f.write(CHARLES_CERT)
        cert_file = f.name
    
    try:
        # 使用OpenSSL命令计算hash
        result = subprocess.run(
            ['openssl', 'x509', '-subject_hash_old', '-noout', '-in', cert_file],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            hash_value = result.stdout.strip()
            print(f"✓ 使用OpenSSL计算的hash: {hash_value}")
            return hash_value
        else:
            print(f"✗ OpenSSL命令失败: {result.stderr}")
            return None
    except FileNotFoundError:
        print("✗ 未找到OpenSSL命令")
        return None
    finally:
        # 清理临时文件
        try:
            os.unlink(cert_file)
        except:
            pass


def get_cert_hash_python():
    """使用Python cryptography库计算hash"""
    try:
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        import hashlib
        
        # 解析证书
        cert = x509.load_pem_x509_certificate(
            CHARLES_CERT.encode(),
            default_backend()
        )
        
        # 获取Subject
        subject = cert.subject
        
        # 构建Subject字符串
        subject_parts = []
        for attr in subject:
            subject_parts.append(f"{attr.oid._name}={attr.value}")
        
        subject_str = "/" + "/".join(subject_parts)
        print(f"Subject DN: {subject_str}")
        
        # 计算MD5 hash
        hash_obj = hashlib.md5(subject_str.encode())
        hash_bytes = hash_obj.digest()
        
        # 转换为OpenSSL格式
        hash_value = int.from_bytes(hash_bytes[:4], byteorder='little')
        hash_hex = f"{hash_value:08x}"
        
        print(f"✓ 使用Python计算的hash: {hash_hex}")
        return hash_hex
        
    except Exception as e:
        print(f"✗ Python计算失败: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("Charles证书Hash计算工具")
    print("=" * 60)
    
    print("\n方法1: 使用OpenSSL命令")
    hash1 = get_cert_hash_openssl()
    
    print("\n方法2: 使用Python cryptography库")
    hash2 = get_cert_hash_python()
    
    print("\n" + "=" * 60)
    print("结果:")
    if hash1:
        print(f"OpenSSL hash: {hash1}")
        print(f"证书文件名: {hash1}.0")
    if hash2:
        print(f"Python hash:  {hash2}")
        print(f"证书文件名: {hash2}.0")
    
    if hash1 and hash2 and hash1 == hash2:
        print("\n✓ 两种方法计算结果一致!")
    elif hash1 or hash2:
        print("\n⚠ 建议使用OpenSSL的结果作为标准")
    print("=" * 60)

