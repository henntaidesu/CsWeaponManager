@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

echo ============================================================
echo   CS Weapon Manager - 版本更新工具
echo ============================================================
echo.

:: 安装目录为脚本所在目录
set "INSTALL_DIR=%~dp0"
if "%INSTALL_DIR:~-1%"=="\" set "INSTALL_DIR=%INSTALL_DIR:~0,-1%"

echo [信息] 安装目录: %INSTALL_DIR%
echo.

:: ============================================
:: 检查更新包
:: ============================================
if not exist "%INSTALL_DIR%\CsWeaponManager.zip" (
    echo [错误] 未找到更新包！
    echo.
    echo 请将 CsWeaponManager.zip 放到安装目录下。
    echo.
    pause
    exit /b 1
)

:: ============================================
:: 第一步：停止服务
:: ============================================
echo [步骤 1/3] 停止正在运行的服务...

tasklist /FI "IMAGENAME eq backEnd.exe" 2>nul | find /I "backEnd.exe" >nul
if %errorlevel%==0 (
    echo   - 正在停止 backEnd.exe...
    taskkill /F /IM backEnd.exe >nul 2>&1
)

tasklist /FI "IMAGENAME eq Spider.exe" 2>nul | find /I "Spider.exe" >nul
if %errorlevel%==0 (
    echo   - 正在停止 Spider.exe...
    taskkill /F /IM Spider.exe >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo   - 服务已停止
echo.

:: ============================================
:: 第二步：删除旧文件（保留指定文件）
:: ============================================
echo [步骤 2/3] 清理旧版本文件...

:: 删除文件（保留 csweaponmanager.db、conf.ini、CsWeaponManager.zip、start_all.bat）
for %%F in ("%INSTALL_DIR%\*") do (
    set "FNAME=%%~nxF"
    if /I not "!FNAME!"=="csweaponmanager.db" (
    if /I not "!FNAME!"=="conf.ini" (
    if /I not "!FNAME!"=="CsWeaponManager.zip" (
    if /I not "!FNAME!"=="start_all.bat" (
    if /I not "!FNAME!"=="update.bat" (
        del /F /Q "%%F" 2>nul
    )))))
)

:: 删除文件夹（保留 weapon_imgs）
for /D %%D in ("%INSTALL_DIR%\*") do (
    set "DNAME=%%~nxD"
    if /I not "!DNAME!"=="weapon_imgs" (
        rmdir /s /q "%%D" 2>nul
    )
)

echo   - 旧文件已清理
echo.

:: ============================================
:: 第三步：解压更新包
:: ============================================
echo [步骤 3/3] 解压更新包...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%INSTALL_DIR%\CsWeaponManager.zip' -DestinationPath '%INSTALL_DIR%' -Force"

if %errorlevel% neq 0 (
    echo [错误] 解压更新包失败！
    pause
    exit /b 1
)

:: 删除更新包
del /F /Q "%INSTALL_DIR%\CsWeaponManager.zip" 2>nul

echo   - 解压完成
echo.
echo ============================================================
echo   更新完成！
echo ============================================================
echo.
echo 保留的文件:
echo   - csweaponmanager.db  (数据库)
echo   - weapon_imgs\        (武器图片)
echo   - conf.ini            (配置文件)
echo.

:: 启动服务
if exist "%INSTALL_DIR%\start_all.bat" (
    echo 正在启动服务...
    cd /d "%INSTALL_DIR%"
    call start_all.bat
) else (
    echo [警告] 未找到 start_all.bat，请手动启动服务。
    pause
)
