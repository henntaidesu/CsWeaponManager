@echo off
echo Starting PyInstaller packaging process...

:: Set version number (modify this for each release)
set VERSION=v2.7.0

:: Sync version to package.json
echo Syncing version to package.json...
:: Extract version number (remove 'v' prefix if present)
set VERSION_NUM=%VERSION%
if "%VERSION_NUM:~0,1%"=="v" set VERSION_NUM=%VERSION_NUM:~1%
:: Update package.json using PowerShell (via temp script)
set TEMP_PS=%TEMP%\sync_version_temp.ps1
echo $filePath = Resolve-Path 'WebSite\package.json' > "%TEMP_PS%"
echo $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8) >> "%TEMP_PS%"
echo $content = $content -replace '^\uFEFF', '' >> "%TEMP_PS%"
echo $oldVersion = 'unknown' >> "%TEMP_PS%"
echo if ($content -match '"version"\s*:\s*"([^"]+)"'^) { $oldVersion = $matches[1] } >> "%TEMP_PS%"
echo $content = [regex]::Replace($content, '"version"\s*:\s*"([^"]+)"', '"version": "%VERSION_NUM%"') >> "%TEMP_PS%"
echo $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False >> "%TEMP_PS%"
echo [System.IO.File]::WriteAllText($filePath, $content, $Utf8NoBomEncoding) >> "%TEMP_PS%"

echo Write-Host "Version synced: $oldVersion -^> %VERSION_NUM%" >> "%TEMP_PS%"
powershell -NoProfile -ExecutionPolicy Bypass -File %TEMP_PS%
if %errorlevel% neq 0 (
    echo Warning: Failed to sync version to package.json
) else (
    echo Version synced successfully to package.json
)
del %TEMP_PS% >nul 2>&1

:: Activate conda environment
call conda activate CSWM
if %errorlevel% neq 0 (
    echo Error: Failed to activate conda environment CSWM
    pause
    exit /b 1
)

:: Create Releases directory and version subdirectory if they don't exist
if not exist "Releases" mkdir Releases
if not exist "Releases\%VERSION%" mkdir "Releases\%VERSION%"
echo Creating release in: Releases\%VERSION%

:: Clear previous builds
echo Cleaning previous builds...
if exist "backEnd\dist" rmdir /s /q "backEnd\dist"
if exist "backEnd\build" rmdir /s /q "backEnd\build"
if exist "Spider\dist" rmdir /s /q "Spider\dist"
if exist "Spider\build" rmdir /s /q "Spider\build"

:: Build WebSite first (its dist is bundled into backEnd.exe below)
if exist "WebSite" (
    echo.
    echo Building WebSite production bundle...
    cd WebSite

    :: Install dependencies if node_modules doesn't exist
    if not exist "node_modules" (
        echo Installing WebSite dependencies...
        call npm install
        if %errorlevel% neq 0 (
            echo Error: Failed to install WebSite dependencies
            cd ..
            pause
            exit /b 1
        )
    )

    call npm run build
    if %errorlevel% neq 0 (
        echo Error: Failed to build WebSite
        cd ..
        pause
        exit /b 1
    )
    cd ..

    if not exist "WebSite\dist" (
        echo Error: WebSite dist folder not found after build
        pause
        exit /b 1
    )
) else (
    echo Error: WebSite folder not found - cannot bundle web resources into backEnd.exe
    pause
    exit /b 1
)

:: Package backEnd.py
:: --add-data 将前端构建产物 (WebSite/dist) 一并打包进 exe，运行时解压到 sys._MEIPASS
echo.
echo [1/2] Packaging backEnd.exe (含 Web 页面资源)...
cd backEnd
pyinstaller --onefile --clean --noconfirm --add-data "..\WebSite\dist;WebSite/dist" backEnd.py --distpath "..\Releases\%VERSION%"
if %errorlevel% neq 0 (
    echo Error: Failed to package backEnd.py
    cd ..
    pause
    exit /b 1
)
cd ..

:: Package Spider.py (with Playwright browser bundling)
echo.
echo [2/2] Packaging Spider.exe with Playwright support...

:: Check if Playwright browsers are installed
echo Checking Playwright browser installation...
cd Spider

:: Use a simpler check that won't hang
for /f "tokens=*" %%i in ('python -c "from pathlib import Path; import os; print((Path(os.environ.get('LOCALAPPDATA', '')) / 'ms-playwright').exists())" 2^>nul') do set BROWSER_EXISTS=%%i

if /i "%BROWSER_EXISTS%"=="False" (
    echo.
    echo ========================================
    echo WARNING: Playwright browsers not found!
    echo ========================================
    echo.
    echo The Spider module requires Playwright browsers to be installed.
    echo Installing Playwright browsers now...

    :: Try to install browsers automatically
    if exist "install_playwright_browsers.bat" (
        echo Running install_playwright_browsers.bat...
        call install_playwright_browsers.bat
        if %errorlevel% neq 0 (
            echo Warning: Browser installation may have failed.
            echo Trying direct installation...
            playwright install chromium 2>nul
        )
    ) else (
        echo Installing Playwright browsers directly...
        playwright install chromium 2>nul
    )

    echo.
    echo Browser installation attempt completed.
    echo.
) else if /i "%BROWSER_EXISTS%"=="True" (
    echo Playwright browsers found. Proceeding with packaging...
) else (
    echo Could not determine browser installation status. Proceeding anyway...
)

:: Now proceed with packaging
echo.
echo Packaging Spider.exe...
pyinstaller --clean --noconfirm Spider.spec --distpath "..\Releases\%VERSION%"
if %errorlevel% neq 0 (
    echo Error: Failed to package Spider.py
    echo Note: If the error is related to Playwright:
    echo   1. Run install_playwright_browsers.bat in the Spider directory
    echo   2. Then run this script again
    cd ..
    pause
    exit /b 1
)
cd ..

:: WebServer 已合并进 backEnd.exe（backEnd 内部用独立线程提供 9003 Web 页面），不再单独打包

:: Copy additional files to version folder
echo.
echo Copying additional files to version folder...
if exist "Releases\start_all.bat" (
    copy "Releases\start_all.bat" "Releases\%VERSION%\start_all.bat"
    echo start_all.bat copied successfully
) else (
    echo Warning: start_all.bat not found in Releases folder
)

if exist "Releases\conf.ini" (
    copy "Releases\conf.ini" "Releases\%VERSION%\conf.ini"
    echo conf.ini copied successfully
) else (
    echo Warning: conf.ini not found in Releases folder
)

if exist "Releases\cswm.p12" (
    copy "Releases\cswm.p12" "Releases\%VERSION%\cswm.p12"
    echo cswm.p12 copied successfully
) else (
    echo Warning: cswm.p12 not found in Releases folder
)

:: Copy update.bat
if exist "update.bat" (
    copy "update.bat" "Releases\%VERSION%\update.bat"
    echo update.bat copied successfully
) else (
    echo Warning: update.bat not found in root folder
)

:: Copy Documents folder
if exist "Documents" (
    echo Copying Documents folder...
    xcopy "Documents" "Releases\%VERSION%\Documents\" /E /I /H /Y /Q
    echo Documents folder copied successfully
) else (
    echo Warning: Documents folder not found
)

:: WebSite/dist 已在打包阶段嵌入 backEnd.exe（--add-data），无需再复制到发布目录

:: Create log directory (required by both backEnd.exe and Spider.exe)
if not exist "Releases\%VERSION%\log" mkdir "Releases\%VERSION%\log"
echo log directory created successfully

:: Copy existing logs if they exist
if exist "logs" (
    xcopy "logs" "Releases\%VERSION%\logs" /E /I /H /Y
    echo logs folder copied successfully
) else (
    echo Warning: logs folder not found in root directory
)

:: Clean up build artifacts
echo.
echo Cleaning up build artifacts...
if exist "backEnd\build" rmdir /s /q "backEnd\build"
if exist "backEnd\*.spec" del /q "backEnd\*.spec"
if exist "Spider\build" rmdir /s /q "Spider\build"
echo Note: Spider\Spider.spec is kept in version control for Playwright bundling

:: Display results
echo.
echo ========================================
echo Packaging completed successfully!
echo ========================================
echo All executables have been created in: Releases\%VERSION%
dir /b "Releases\%VERSION%\*.exe"
echo ========================================

:: Code signing (self-signed certificate, to bypass Device Guard / Smart App Control)
echo.
echo Signing executables with self-signed certificate...
echo Note: This requires administrator privileges to import certificate into Trusted Root CA.

:: Run signing with elevation via PowerShell (needs admin to write to LocalMachine\Root)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$releaseDir = 'Releases\%VERSION%';" ^
    "$certSubject = 'CsWeaponManager';" ^
    "$myStore = 'Cert:\CurrentUser\My';" ^
    "$rootStore = 'Cert:\LocalMachine\Root';" ^
    "$cert = Get-ChildItem $myStore | Where-Object { $_.Subject -like ('CN=' + $certSubject + '*') } | Select-Object -First 1;" ^
    "if (-not $cert) {" ^
        "Write-Host 'Creating new self-signed certificate...';" ^
        "$cert = New-SelfSignedCertificate -Subject ('CN=' + $certSubject) -CertStoreLocation $myStore -KeyUsage DigitalSignature -Type CodeSigningCert -NotAfter (Get-Date).AddYears(10);" ^
        "Write-Host ('Certificate created: ' + $cert.Thumbprint);" ^
    "} else {" ^
        "Write-Host ('Using existing certificate: ' + $cert.Thumbprint);" ^
    "};" ^
    "$alreadyTrusted = Get-ChildItem $rootStore | Where-Object { $_.Thumbprint -eq $cert.Thumbprint } | Select-Object -First 1;" ^
    "if (-not $alreadyTrusted) {" ^
        "Write-Host 'Importing certificate into Trusted Root CA (requires admin)...';" ^
        "try {" ^
            "$store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','LocalMachine');" ^
            "$store.Open('ReadWrite');" ^
            "$store.Add($cert);" ^
            "$store.Close();" ^
            "Write-Host 'Certificate imported into Trusted Root CA.' -ForegroundColor Green;" ^
        "} catch {" ^
            "Write-Host ('Failed to import into Trusted Root CA: ' + $_.Exception.Message) -ForegroundColor Red;" ^
            "Write-Host 'Hint: Re-run pyinstaller.bat as Administrator to fix this.' -ForegroundColor Yellow;" ^
        "}" ^
    "} else {" ^
        "Write-Host 'Certificate already trusted.';" ^
    "};" ^
    "$exeFiles = Get-ChildItem -Path $releaseDir -Filter '*.exe';" ^
    "foreach ($exe in $exeFiles) {" ^
        "Write-Host ('Signing: ' + $exe.Name + '...');" ^
        "$result = Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -Force;" ^
        "if ($result.Status -eq 'Valid') {" ^
            "Write-Host ('  OK: ' + $exe.Name) -ForegroundColor Green;" ^
        "} else {" ^
            "Write-Host ('  WARN: ' + $exe.Name + ' - ' + $result.Status) -ForegroundColor Yellow;" ^
        "}" ^
    "};" ^
    "Write-Host 'Signing completed.'"

if %errorlevel% neq 0 (
    echo Warning: Code signing failed. EXE files may be blocked by Device Guard.
) else (
    echo Code signing completed.
)

:: Create ZIP file
echo.
echo Creating ZIP archive...

:: set ZIP_FILE=Releases\%VERSION%.zip
set ZIP_FILE=Releases\CsWeaponManager.zip
:: Remove old zip if exists
if exist "%ZIP_FILE%" (
    echo Removing old ZIP file...
    del /q "%ZIP_FILE%"
)

:: Use PowerShell to create ZIP archive with NoProfile to avoid path issues
echo Compressing files to %ZIP_FILE%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path 'Releases\%VERSION%\*' -DestinationPath '%ZIP_FILE%' -CompressionLevel Optimal -Force"

if %errorlevel% neq 0 (
    echo Warning: Failed to create ZIP archive
) else (
    echo.
    echo ========================================
    echo ZIP archive created successfully!
    echo ========================================
    echo Location: %ZIP_FILE%
    for %%A in ("%ZIP_FILE%") do echo Size: %%~zA bytes
    echo ========================================
)

pause