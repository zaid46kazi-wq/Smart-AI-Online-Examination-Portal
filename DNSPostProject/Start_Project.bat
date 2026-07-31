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

echo ==== Startup Sequence %date% %time% ==== > "%LOG_FILE%"

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
        echo [%date% %time%] Root .env file missing >> "%ERROR_LOG_FILE%"
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

:: 6. MySQL Check
echo [*] Checking MySQL Database Service (Port %MYSQL_PORT%)...
set "MYSQL_STATUS=FAIL"
set "DB_CONN_STATUS=FAIL"

call :CheckTcpPort %MYSQL_PORT%
if %PORT_OPEN% equ 1 (
    echo [✓] MySQL is already running on port %MYSQL_PORT%.
    set "MYSQL_STATUS=PASS"
    goto MySQLReady
)

echo [i] MySQL is not running on port %MYSQL_PORT%. Searching for installed MySQL service...
set "DETECTED_MYSQL_SVC="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -NonInteractive -Command "Get-Service *mysql* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Select-Object -First 1"`) do set "DETECTED_MYSQL_SVC=%%a"

if "%DETECTED_MYSQL_SVC%"=="" goto MySQLCheckDone

echo [*] Attempting to start MySQL service '%DETECTED_MYSQL_SVC%'...
powershell -NoProfile -NonInteractive -Command "try { Start-Service '%DETECTED_MYSQL_SVC%' -ErrorAction SilentlyContinue } catch {}" >nul 2>&1

set "MYSQL_WAIT_COUNT=0"
:MySQLWaitLoop
call :CheckTcpPort %MYSQL_PORT%
if %PORT_OPEN% equ 1 (
    set "MYSQL_STATUS=PASS"
    echo [✓] MySQL service started successfully.
    goto MySQLReady
)
set /a MYSQL_WAIT_COUNT+=1
if %MYSQL_WAIT_COUNT% lss 5 (
    timeout /t 1 >nul
    goto MySQLWaitLoop
)

:MySQLCheckDone
if "%MYSQL_STATUS%"=="FAIL" (
    echo [i] Note: Could not auto-start MySQL service. Proceeding with application startup...
    echo [%date% %time%] MySQL service not listening on port 3306 >> "%ERROR_LOG_FILE%"
)

:MySQLReady

:: 7. Port Conflict Management
echo [*] Checking required ports for conflicts...

:: Backend Port Check
set "BACKEND_OCCUPIED_PID="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -NonInteractive -Command "$c = Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Write-Host $c.OwningProcess }"`) do set "BACKEND_OCCUPIED_PID=%%a"

if not "%BACKEND_OCCUPIED_PID%"=="" (
    echo [i] Port %BACKEND_PORT% occupied by PID %BACKEND_OCCUPIED_PID%. Terminating process...
    powershell -NoProfile -NonInteractive -Command "Stop-Process -Id %BACKEND_OCCUPIED_PID% -Force -ErrorAction SilentlyContinue" >nul 2>&1
    echo [✓] Process %BACKEND_OCCUPIED_PID% terminated.
)

:: Frontend Port Check
set "FRONTEND_OCCUPIED_PID="
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -NonInteractive -Command "$c = Get-NetTCPConnection -LocalPort %FRONTEND_PORT% -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Write-Host $c.OwningProcess }"`) do set "FRONTEND_OCCUPIED_PID=%%a"

if not "%FRONTEND_OCCUPIED_PID%"=="" (
    echo [i] Port %FRONTEND_PORT% occupied by PID %FRONTEND_OCCUPIED_PID%. Terminating process...
    powershell -NoProfile -NonInteractive -Command "Stop-Process -Id %FRONTEND_OCCUPIED_PID% -Force -ErrorAction SilentlyContinue" >nul 2>&1
    echo [✓] Process %FRONTEND_OCCUPIED_PID% terminated.
)

:: 8. Backend Dependencies
echo [*] Checking Backend Dependencies...
if not exist "%BACKEND_PATH%\node_modules" (
    echo [i] Backend node_modules missing. Installing dependencies automatically...
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
    echo [✓] Backend dependencies found.
)

:: 9. Frontend Dependencies
echo [*] Checking Frontend Dependencies...
if not exist "%FRONTEND_PATH%\node_modules" (
    echo [i] Frontend node_modules missing. Installing dependencies automatically...
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
    echo [✓] Frontend dependencies found.
)

:: 10. Start Backend Server
echo [*] Starting Backend Server...
cd /d "%BACKEND_PATH%"
start "Backend API Server" cmd /k "cd /d "%BACKEND_PATH%" && npm run dev"
cd /d "%PROJECT_ROOT%"

:: Poll Backend health
echo [*] Waiting for Backend API (http://localhost:%BACKEND_PORT%/api/health) to initialize...
set "BACKEND_STATUS=FAIL"
set "BACKEND_WAIT_COUNT=0"

:BackendWaitLoop
call :CheckUrlHealth "http://localhost:%BACKEND_PORT%/api/health"
if %URL_HEALTH_OK% equ 1 (
    set "BACKEND_STATUS=PASS"
    echo [✓] Backend API is up and running.
    goto BackendReady
)
set /a BACKEND_WAIT_COUNT+=1
if %BACKEND_WAIT_COUNT% lss 20 (
    timeout /t 1 >nul
    goto BackendWaitLoop
)

if "%BACKEND_STATUS%"=="FAIL" (
    echo [i] Backend startup timeout. Attempting restart...
    echo [%date% %time%] Backend timeout >> "%ERROR_LOG_FILE%"
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

:: Test DB Connection via API
call :CheckUrlHealth "http://localhost:%BACKEND_PORT%/api/subjects"
if %URL_HEALTH_OK% equ 1 set "DB_CONN_STATUS=PASS"

:: 11. Start Frontend Server
echo [*] Starting Frontend Server...
cd /d "%FRONTEND_PATH%"
start "Frontend UI Server" cmd /k "cd /d "%FRONTEND_PATH%" && npm run dev"
cd /d "%PROJECT_ROOT%"

:: Poll Frontend health
echo [*] Waiting for Frontend UI (http://localhost:%FRONTEND_PORT%) to initialize...
set "FRONTEND_STATUS=FAIL"
set "FRONTEND_WAIT_COUNT=0"

:FrontendWaitLoop
call :CheckUrlHealth "http://localhost:%FRONTEND_PORT%"
if %URL_HEALTH_OK% equ 1 (
    set "FRONTEND_STATUS=PASS"
    echo [✓] Frontend UI is up and running.
    goto FrontendReady
)
set /a FRONTEND_WAIT_COUNT+=1
if %FRONTEND_WAIT_COUNT% lss 20 (
    timeout /t 1 >nul
    goto FrontendWaitLoop
)

if "%FRONTEND_STATUS%"=="FAIL" (
    echo [i] Frontend startup timeout. Attempting restart...
    echo [%date% %time%] Frontend timeout >> "%ERROR_LOG_FILE%"
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

:: 12. Open Web Browser
set "BROWSER_STATUS=FAIL"
echo [*] Opening Web Browser...
start http://localhost:%FRONTEND_PORT%
if %ERRORLEVEL% equ 0 set "BROWSER_STATUS=PASS"

:: 13. Professional Status Dashboard
cls
echo ========================================
echo AI ONLINE EXAMINATION SYSTEM
echo ========================================
if "%MYSQL_STATUS%"=="PASS" (echo [✓] MySQL Running) else (echo [X] MySQL Stopped)
if "%DB_CONN_STATUS%"=="PASS" (echo [✓] Database Connected) else (echo [X] Database Connection Failed)
if "%BACKEND_STATUS%"=="PASS" (echo [✓] Backend Running) else (echo [X] Backend Failed)
if "%FRONTEND_STATUS%"=="PASS" (echo [✓] Frontend Running) else (echo [X] Frontend Failed)
if "%BROWSER_STATUS%"=="PASS" (echo [✓] Browser Opened) else (echo [X] Browser Launch Failed)
if "%JWT_STATUS%"=="PASS" (echo [✓] JWT Ready) else (echo [X] JWT Key Missing)
if "%MEDIAPIPE_STATUS%"=="PASS" (echo [✓] MediaPipe Ready) else (echo [X] MediaPipe Missing)
if "%GEMINI_STATUS%"=="PASS" (echo [✓] Gemini API Ready) else (echo [X] Gemini API Key Missing)
echo ========================================
if "%BACKEND_STATUS%"=="PASS" if "%FRONTEND_STATUS%"=="PASS" (
    echo System Ready
) else (
    echo System Warning: Some components failed. Check logs in %LOG_DIR%
)
echo ========================================
echo.
echo Access Endpoints:
echo  Frontend UI:  http://localhost:%FRONTEND_PORT%
echo  Backend API:  http://localhost:%BACKEND_PORT%
echo  Health Check: http://localhost:%BACKEND_PORT%/api/health
echo.
echo Startup log saved to: %LOG_FILE%
echo Press any key to exit this launcher window...
pause >nul
exit /b 0

:ErrRootPkg
echo [X] Error: Root package.json missing in %PROJECT_ROOT%
pause
exit /b 1

:ErrBackendPkg
echo [X] Error: Backend package.json missing in %BACKEND_PATH%
pause
exit /b 1

:ErrFrontendPkg
echo [X] Error: Frontend package.json missing in %FRONTEND_PATH%
pause
exit /b 1

:ErrNode
echo [X] Error: Node.js is not installed or not in PATH.
pause
exit /b 1

:ErrNpm
echo [X] Error: npm is not installed or not in PATH.
pause
exit /b 1
