@echo off
setlocal EnableDelayedExpansion
goto Main

:: ==========================================
:: HELPER SUBROUTINES
:: ==========================================

:CheckTcpPort
set "PORT_TO_CHECK=%~1"
set "PORT_OPEN=0"
powershell -NoProfile -NonInteractive -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', %PORT_TO_CHECK%); exit 0 } catch { exit 1 } finally { $c.Close() }" >nul 2>&1
if %ERRORLEVEL% equ 0 set "PORT_OPEN=1"
exit /b 0

:CheckUrlHealth
set "URL_TO_CHECK=%~1"
set "URL_HEALTH_OK=0"
powershell -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -Uri '%URL_TO_CHECK%' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 set "URL_HEALTH_OK=1"
exit /b 0

:Main
title Launch AI Online Examination System
color 0B

:: ==========================================
:: CONFIGURATION VARIABLES
:: ==========================================
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_PATH=%PROJECT_ROOT%\backend"
set "FRONTEND_PATH=%PROJECT_ROOT%\frontend"
set "LOG_DIR=%PROJECT_ROOT%\logs"
set "BACKEND_PORT=5000"
set "FRONTEND_PORT=5174"
set "MYSQL_PORT=3306"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\Startup_Log.log"
set "ERROR_LOG_FILE=%LOG_DIR%\Error_Log.log"

for /f "usebackq tokens=*" %%t in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set "TSTAMP=%%t"
echo ========================================================= >> "%LOG_FILE%"
echo [%TSTAMP%] Starting AI Online Examination System Launcher >> "%LOG_FILE%"
echo ========================================================= >> "%LOG_FILE%"

:: Clear console and show banner
cls
echo =========================================================
echo       AI ONLINE EXAMINATION SYSTEM - LAUNCHER
echo =========================================================
echo.

:: 1. Verify Directory Structure & package.json
echo [*] Verifying project directory structure...
if not exist "%PROJECT_ROOT%\package.json" goto ErrRootPkg
if not exist "%BACKEND_PATH%\package.json" goto ErrBackendPkg
if not exist "%FRONTEND_PATH%\package.json" goto ErrFrontendPkg
echo [✓] Project directories and package.json files verified.
echo [%TSTAMP%] Project structure verified >> "%LOG_FILE%"

:: 2. Check Node.js installation
echo [*] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 goto ErrNode
echo [✓] Node.js is installed.

:: 3. Check npm installation
echo [*] Checking npm installation...
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 goto ErrNpm
echo [✓] npm is installed.

:: 4. Check Environment Configuration (.env)
echo [*] Checking Environment Configuration...
if not exist "%PROJECT_ROOT%\.env" (
    if exist "%PROJECT_ROOT%\.env.example" (
        echo [i] .env file missing. Creating from .env.example...
        copy "%PROJECT_ROOT%\.env.example" "%PROJECT_ROOT%\.env" >nul
        echo [✓] .env created from template.
    ) else (
        echo [i] Warning: Root .env file is missing!
        echo [%TSTAMP%] Root .env file missing >> "%ERROR_LOG_FILE%"
    )
) else (
    echo [✓] Root .env found.
)

set "JWT_STATUS=FAIL"
set "GEMINI_STATUS=FAIL"
if exist "%PROJECT_ROOT%\.env" (
    findstr /C:"JWT_SECRET=" "%PROJECT_ROOT%\.env" >nul
    if !ERRORLEVEL! equ 0 set "JWT_STATUS=PASS"
    findstr /C:"GEMINI_API_KEY=" "%PROJECT_ROOT%\.env" >nul
    if !ERRORLEVEL! equ 0 set "GEMINI_STATUS=PASS"
)

:: 5. Check MediaPipe Component
set "MEDIAPIPE_STATUS=FAIL"
if exist "%FRONTEND_PATH%\src\components\MediaPipeProctor.jsx" (
    set "MEDIAPIPE_STATUS=PASS"
    echo [✓] MediaPipe Integration component found.
) else (
    echo [i] Warning: MediaPipe Proctor component missing.
)

:: 6. MySQL Check & Auto-Startup
echo.
echo =========================================================
echo [*] Checking MySQL Database Service (Port %MYSQL_PORT%)...
echo =========================================================
set "MYSQL_STATUS=FAIL"
set "DB_CONN_STATUS=FAIL"

:: Check if MySQL is ALREADY running on port 3306
call :CheckTcpPort %MYSQL_PORT%
if %PORT_OPEN% equ 1 (
    echo [✓] MySQL is already running on port %MYSQL_PORT%.
    echo [%TSTAMP%] MySQL is already running on port %MYSQL_PORT% >> "%LOG_FILE%"
    set "MYSQL_STATUS=PASS"
    goto MySQLReady
)

echo [i] MySQL is NOT running on port %MYSQL_PORT%.

:: Check Administrator / Elevated Privileges
net session >nul 2>&1
set "IS_ADMIN=0"
if %ERRORLEVEL% equ 0 set "IS_ADMIN=1"

if %IS_ADMIN% equ 0 (
    echo [i] Admin privileges required to start MySQL service.
    echo [*] Requesting Administrator UAC elevation...
    echo [%TSTAMP%] Requesting UAC elevation for MySQL start >> "%LOG_FILE%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c ""%~f0"" %*' -Verb RunAs"
    if %ERRORLEVEL% equ 0 (
        echo [✓] Elevated launcher window opened. Exiting this non-elevated instance.
        exit /b 0
    ) else (
        echo [X] UAC Elevation was declined or failed.
        echo [%TSTAMP%] UAC Elevation declined by user >> "%ERROR_LOG_FILE%"
    )
)

:: Elevated / Admin Mode: Detect Installed MySQL Services
echo [*] Searching for installed MySQL Windows Services...
set "DETECTED_SERVICES="
for /f "usebackq tokens=*" %%s in (`powershell -NoProfile -NonInteractive -Command "Get-Service *mysql*,*mariadb*,*wamp*,*xampp* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"`) do (
    set "DETECTED_SERVICES=!DETECTED_SERVICES! %%s"
)

if "%DETECTED_SERVICES%"=="" (
    :: Fallback hardcoded common service names
    set "DETECTED_SERVICES=MySQL80 MySQL97 MySQL83 MySQL MariaDB wampmysqld64 xampp-mysql"
)

echo [i] Candidate MySQL Services found: %DETECTED_SERVICES%

:: Try starting detected services one by one
for %%s in (%DETECTED_SERVICES%) do (
    if "!MYSQL_STATUS!"=="FAIL" (
        echo [*] Attempting to start service '%%s'...
        echo [%TSTAMP%] Attempting net start %%s >> "%LOG_FILE%"
        net start "%%s" >nul 2>&1
        
        :: Wait and poll port 3306 for up to 10 seconds
        set "WAIT_CNT=0"
        :PollServiceLoop
        call :CheckTcpPort %MYSQL_PORT%
        if !PORT_OPEN! equ 1 (
            set "MYSQL_STATUS=PASS"
            echo [✓] Successfully started MySQL service '%%s'.
            echo [%TSTAMP%] Successfully started MySQL service %%s >> "%LOG_FILE%"
            goto MySQLReady
        )
        set /a WAIT_CNT+=1
        if !WAIT_CNT! lss 10 (
            timeout /t 1 >nul
            goto PollServiceLoop
        )
    )
)

:: Fallback: Try launching standalone mysqld.exe if binary exists
if "%MYSQL_STATUS%"=="FAIL" (
    echo [*] Searching for standalone mysqld.exe binary...
    set "MYSQLD_BIN="
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" set "MYSQLD_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
    if exist "C:\Program Files\MySQL\MySQL Server 9.7\bin\mysqld.exe" set "MYSQLD_BIN=C:\Program Files\MySQL\MySQL Server 9.7\bin\mysqld.exe"
    if exist "C:\xampp\mysql\bin\mysqld.exe" set "MYSQLD_BIN=C:\xampp\mysql\bin\mysqld.exe"
    
    if not "!MYSQLD_BIN!"=="" (
        echo [*] Launching standalone MySQL daemon: !MYSQLD_BIN!
        echo [%TSTAMP%] Launching standalone mysqld: !MYSQLD_BIN! >> "%LOG_FILE%"
        start /b "" "!MYSQLD_BIN!" --console >nul 2>&1
        
        set "WAIT_CNT=0"
        :PollStandaloneLoop
        call :CheckTcpPort %MYSQL_PORT%
        if !PORT_OPEN! equ 1 (
            set "MYSQL_STATUS=PASS"
            echo [✓] Standalone MySQL daemon started successfully on port %MYSQL_PORT%.
            echo [%TSTAMP%] Standalone MySQL daemon started >> "%LOG_FILE%"
            goto MySQLReady
        )
        set /a WAIT_CNT+=1
        if !WAIT_CNT! lss 10 (
            timeout /t 1 >nul
            goto PollStandaloneLoop
        )
    )
)

:: If MySQL still failed to start, show error and HALT!
if "%MYSQL_STATUS%"=="FAIL" (
    echo.
    echo =========================================================
    echo [X] CRITICAL ERROR: Could NOT start MySQL Database!
    echo =========================================================
    echo Reason: Port %MYSQL_PORT% is not accepting connections and no
    echo         MySQL service could be started automatically.
    echo.
    echo Troubleshooting Steps:
    echo  1. Run this launcher as Administrator (Right-Click -> Run as Administrator).
    echo  2. Open Services (services.msc) and start 'MySQL80' or 'MySQL97'.
    echo  3. Ensure port %MYSQL_PORT% is not occupied by another application.
    echo  4. Verify MySQL installation path and configuration.
    echo =========================================================
    echo [%TSTAMP%] ERROR: MySQL failed to start >> "%ERROR_LOG_FILE%"
    pause
    exit /b 1
)

:MySQLReady
echo [✓] MySQL Database is ONLINE and ready on port %MYSQL_PORT%.
echo.

:: 7. Port Conflict Management for Backend and Frontend
echo [*] Checking required application ports for conflicts...

:: Backend Port Check (5000)
set "BACKEND_OCCUPIED_PID="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -NonInteractive -Command "$c = Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Write-Host $c.OwningProcess }"`) do set "BACKEND_OCCUPIED_PID=%%a"

if not "%BACKEND_OCCUPIED_PID%"=="" (
    echo [i] Port %BACKEND_PORT% occupied by PID %BACKEND_OCCUPIED_PID%. Terminating stale process...
    powershell -NoProfile -NonInteractive -Command "Stop-Process -Id %BACKEND_OCCUPIED_PID% -Force -ErrorAction SilentlyContinue" >nul 2>&1
    echo [✓] Process %BACKEND_OCCUPIED_PID% terminated.
)

:: Frontend Port Check (5174)
set "FRONTEND_OCCUPIED_PID="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -NonInteractive -Command "$c = Get-NetTCPConnection -LocalPort %FRONTEND_PORT% -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Write-Host $c.OwningProcess }"`) do set "FRONTEND_OCCUPIED_PID=%%a"

if not "%FRONTEND_OCCUPIED_PID%"=="" (
    echo [i] Port %FRONTEND_PORT% occupied by PID %FRONTEND_OCCUPIED_PID%. Terminating stale process...
    powershell -NoProfile -NonInteractive -Command "Stop-Process -Id %FRONTEND_OCCUPIED_PID% -Force -ErrorAction SilentlyContinue" >nul 2>&1
    echo [✓] Process %FRONTEND_OCCUPIED_PID% terminated.
)

:: 8. Backend Dependencies Check
echo [*] Checking Backend Dependencies...
if not exist "%BACKEND_PATH%\node_modules" (
    echo [i] Backend node_modules missing. Installing dependencies...
    cd /d "%BACKEND_PATH%"
    call npm install >> "%LOG_FILE%" 2>> "%ERROR_LOG_FILE%"
    if !ERRORLEVEL! neq 0 (
        echo [X] Error: Backend npm install failed! See %ERROR_LOG_FILE%
        cd /d "%PROJECT_ROOT%"
        pause
        exit /b 1
    )
    cd /d "%PROJECT_ROOT%"
    echo [✓] Backend dependencies installed.
) else (
    echo [✓] Backend dependencies verified.
)

:: 9. Frontend Dependencies Check
echo [*] Checking Frontend Dependencies...
if not exist "%FRONTEND_PATH%\node_modules" (
    echo [i] Frontend node_modules missing. Installing dependencies...
    cd /d "%FRONTEND_PATH%"
    call npm install >> "%LOG_FILE%" 2>> "%ERROR_LOG_FILE%"
    if !ERRORLEVEL! neq 0 (
        echo [X] Error: Frontend npm install failed! See %ERROR_LOG_FILE%
        cd /d "%PROJECT_ROOT%"
        pause
        exit /b 1
    )
    cd /d "%PROJECT_ROOT%"
    echo [✓] Frontend dependencies installed.
) else (
    echo [✓] Frontend dependencies verified.
)

:: 10. Start Backend Server & Verify Health
echo.
echo =========================================================
echo [*] Starting Express Backend Server (Port %BACKEND_PORT%)...
echo =========================================================
cd /d "%BACKEND_PATH%"
start "Backend API Server" cmd /k "cd /d "%BACKEND_PATH%" && npm run dev"
cd /d "%PROJECT_ROOT%"

echo [*] Waiting for Backend API (http://localhost:%BACKEND_PORT%/api/health) to initialize...
set "BACKEND_STATUS=FAIL"
set "BACKEND_WAIT_COUNT=0"

:BackendWaitLoop
call :CheckUrlHealth "http://localhost:%BACKEND_PORT%/api/health"
if %URL_HEALTH_OK% equ 1 (
    set "BACKEND_STATUS=PASS"
    echo [✓] Backend API is ONLINE and HEALTHY.
    echo [%TSTAMP%] Backend API healthy on port %BACKEND_PORT% >> "%LOG_FILE%"
    goto BackendReady
)
set /a BACKEND_WAIT_COUNT+=1
if %BACKEND_WAIT_COUNT% lss 20 (
    timeout /t 1 >nul
    goto BackendWaitLoop
)

if "%BACKEND_STATUS%"=="FAIL" (
    echo [i] Backend startup timeout. Attempting restart...
    echo [%TSTAMP%] Backend timeout - restarting >> "%ERROR_LOG_FILE%"
    powershell -NoProfile -NonInteractive -Command "$c = Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue; foreach ($conn in $c) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    cd /d "%BACKEND_PATH%"
    start "Backend API Server" cmd /k "cd /d "%BACKEND_PATH%" && npm run dev"
    cd /d "%PROJECT_ROOT%"
    
    set "BACKEND_RECOVERY_COUNT=0"
    :BackendRecoveryLoop
    call :CheckUrlHealth "http://localhost:%BACKEND_PORT%/api/health"
    if !URL_HEALTH_OK! equ 1 (
        set "BACKEND_STATUS=PASS"
        echo [✓] Backend API recovered successfully.
        goto BackendReady
    )
    set /a BACKEND_RECOVERY_COUNT+=1
    if !BACKEND_RECOVERY_COUNT! lss 10 (
        timeout /t 1 >nul
        goto BackendRecoveryLoop
    )
)

:BackendReady

:: Test DB Connection via Backend API
call :CheckUrlHealth "http://localhost:%BACKEND_PORT%/api/subjects"
if %URL_HEALTH_OK% equ 1 set "DB_CONN_STATUS=PASS"

:: 11. Start Frontend Server & Verify Health
echo.
echo =========================================================
echo [*] Starting React Vite Frontend Server (Port %FRONTEND_PORT%)...
echo =========================================================
cd /d "%FRONTEND_PATH%"
start "Frontend UI Server" cmd /k "cd /d "%FRONTEND_PATH%" && npm run dev"
cd /d "%PROJECT_ROOT%"

echo [*] Waiting for Frontend UI (http://localhost:%FRONTEND_PORT%) to initialize...
set "FRONTEND_STATUS=FAIL"
set "FRONTEND_WAIT_COUNT=0"

:FrontendWaitLoop
call :CheckUrlHealth "http://localhost:%FRONTEND_PORT%"
if %URL_HEALTH_OK% equ 1 (
    set "FRONTEND_STATUS=PASS"
    echo [✓] Frontend UI is ONLINE and READY.
    echo [%TSTAMP%] Frontend UI healthy on port %FRONTEND_PORT% >> "%LOG_FILE%"
    goto FrontendReady
)
set /a FRONTEND_WAIT_COUNT+=1
if %FRONTEND_WAIT_COUNT% lss 20 (
    timeout /t 1 >nul
    goto FrontendWaitLoop
)

if "%FRONTEND_STATUS%"=="FAIL" (
    echo [i] Frontend startup timeout. Attempting restart...
    echo [%TSTAMP%] Frontend timeout - restarting >> "%ERROR_LOG_FILE%"
    powershell -NoProfile -NonInteractive -Command "$c = Get-NetTCPConnection -LocalPort %FRONTEND_PORT% -ErrorAction SilentlyContinue; foreach ($conn in $c) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    cd /d "%FRONTEND_PATH%"
    start "Frontend UI Server" cmd /k "cd /d "%FRONTEND_PATH%" && npm run dev"
    cd /d "%PROJECT_ROOT%"
    
    set "FRONTEND_RECOVERY_COUNT=0"
    :FrontendRecoveryLoop
    call :CheckUrlHealth "http://localhost:%FRONTEND_PORT%"
    if !URL_HEALTH_OK! equ 1 (
        set "FRONTEND_STATUS=PASS"
        echo [✓] Frontend UI recovered successfully.
        goto FrontendReady
    )
    set /a FRONTEND_RECOVERY_COUNT+=1
    if !FRONTEND_RECOVERY_COUNT! lss 10 (
        timeout /t 1 >nul
        goto FrontendRecoveryLoop
    )
)

:FrontendReady

:: 12. Open Web Browser Automatically
set "BROWSER_STATUS=FAIL"
echo [*] Opening Web Browser automatically (http://localhost:%FRONTEND_PORT%)...
start http://localhost:%FRONTEND_PORT%
if %ERRORLEVEL% equ 0 set "BROWSER_STATUS=PASS"

:: 13. Professional Status Dashboard Summary
cls
echo =========================================================
echo       AI ONLINE EXAMINATION SYSTEM - STATUS SUMMARY
echo =========================================================
if "%MYSQL_STATUS%"=="PASS" (echo [✓] MySQL Service:      ONLINE (Port %MYSQL_PORT%)) else (echo [X] MySQL Service:      OFFLINE)
if "%DB_CONN_STATUS%"=="PASS" (echo [✓] Database Connection: VERIFIED via API) else (echo [X] Database Connection: FAILED)
if "%BACKEND_STATUS%"=="PASS" (echo [✓] Express Backend API: ONLINE (Port %BACKEND_PORT%)) else (echo [X] Express Backend API: FAILED)
if "%FRONTEND_STATUS%"=="PASS" (echo [✓] React Vite Frontend: ONLINE (Port %FRONTEND_PORT%)) else (echo [X] React Vite Frontend: FAILED)
if "%BROWSER_STATUS%"=="PASS" (echo [✓] Web Browser Launch:  SUCCESS) else (echo [X] Web Browser Launch:  FAILED)
if "%JWT_STATUS%"=="PASS" (echo [✓] JWT Authentication: READY) else (echo [X] JWT Authentication: SECRET MISSING)
if "%MEDIAPIPE_STATUS%"=="PASS" (echo [✓] MediaPipe AI Engine: READY) else (echo [X] MediaPipe AI Engine: MISSING)
if "%GEMINI_STATUS%"=="PASS" (echo [✓] Gemini AI Generator: READY) else (echo [X] Gemini AI Generator: KEY MISSING)
echo =========================================================
if "%BACKEND_STATUS%"=="PASS" if "%FRONTEND_STATUS%"=="PASS" (
    echo [✓] SYSTEM LAUNCH COMPLETE - ALL SERVICES READY!
) else (
    echo [!] WARNING: SYSTEM STARTED WITH ERRORS. Check log: %LOG_FILE%
)
echo =========================================================
echo.
echo Application Access URLs:
echo   • Frontend Portal:  http://localhost:%FRONTEND_PORT%
echo   • Backend API:      http://localhost:%BACKEND_PORT%
echo   • Health Status:    http://localhost:%BACKEND_PORT%/api/health
echo.
echo Detailed log saved to: %LOG_FILE%
echo Press any key to exit this launcher window...
pause >nul
exit /b 0

:: ==========================================
:: ERROR LABELS
:: ==========================================

:ErrRootPkg
echo [X] CRITICAL ERROR: Root package.json missing in %PROJECT_ROOT%
pause
exit /b 1

:ErrBackendPkg
echo [X] CRITICAL ERROR: Backend package.json missing in %BACKEND_PATH%
pause
exit /b 1

:ErrFrontendPkg
echo [X] CRITICAL ERROR: Frontend package.json missing in %FRONTEND_PATH%
pause
exit /b 1

:ErrNode
echo [X] CRITICAL ERROR: Node.js is not installed or not added to PATH.
echo     Download Node.js from https://nodejs.org/
pause
exit /b 1

:ErrNpm
echo [X] CRITICAL ERROR: npm is not installed or not added to PATH.
pause
exit /b 1
