@echo off
setlocal EnableDelayedExpansion
title System Health Check - AI Online Examination System
color 0B

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_PATH=%PROJECT_ROOT%\backend"
set "FRONTEND_PATH=%PROJECT_ROOT%\frontend"
set "BACKEND_PORT=5000"
set "FRONTEND_PORT=5174"
set "MYSQL_PORT=3306"
set "LOG_DIR=%PROJECT_ROOT%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\Health_Check.log"

echo ---- Health Check %date% %time% ---- >> "%LOG_FILE%"

cls
echo ============================================
echo       SYSTEM HEALTH CHECK
echo ============================================
echo.

set "MYSQL_PASS=0"
set "BACKEND_PASS=0"
set "FRONTEND_PASS=0"
set "DB_PASS=0"
set "JWT_PASS=0"
set "GEMINI_PASS=0"
set "MEDIAPIPE_PASS=0"
set "ENV_PASS=0"

:: 1. MySQL Port Check
echo [*] Checking MySQL Service (Port %MYSQL_PORT%)...
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', %MYSQL_PORT%); exit 0 } catch { exit 1 } finally { $c.Close() }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [✓] PASS: MySQL is running on port %MYSQL_PORT%
    echo PASS: MySQL is running >> "%LOG_FILE%"
    set "MYSQL_PASS=1"
) else (
    echo [X] FAIL: MySQL is NOT listening on port %MYSQL_PORT%
    echo FAIL: MySQL is NOT listening >> "%LOG_FILE%"
)

:: 2. Backend Port & Health Check
echo [*] Checking Backend API (Port %BACKEND_PORT%)...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:%BACKEND_PORT%/api/health' -TimeoutSec 3 -ErrorAction Stop; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [✓] PASS: Backend API is running on port %BACKEND_PORT%
    echo PASS: Backend API is running >> "%LOG_FILE%"
    set "BACKEND_PASS=1"
) else (
    echo [X] FAIL: Backend API is NOT listening on port %BACKEND_PORT%
    echo FAIL: Backend API is NOT listening >> "%LOG_FILE%"
)

:: 3. Frontend Port Check
echo [*] Checking Frontend (Port %FRONTEND_PORT%)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%FRONTEND_PORT%' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [✓] PASS: Frontend UI is running on port %FRONTEND_PORT%
    echo PASS: Frontend UI is running >> "%LOG_FILE%"
    set "FRONTEND_PASS=1"
) else (
    echo [X] FAIL: Frontend UI is NOT listening on port %FRONTEND_PORT%
    echo FAIL: Frontend UI is NOT listening >> "%LOG_FILE%"
)

:: 4. Database Connection via API Check
echo [*] Checking Database Connectivity...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:%BACKEND_PORT%/api/health' -TimeoutSec 3 -ErrorAction Stop; if ($r.database.ok) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [✓] PASS: Database connection verified
    echo PASS: Database connection verified >> "%LOG_FILE%"
    set "DB_PASS=1"
) else (
    echo [X] FAIL: Database is unreachable via API
    echo FAIL: Database is unreachable >> "%LOG_FILE%"
)

:: 5. MediaPipe Integration Check
echo [*] Checking MediaPipe Integration...
if exist "%FRONTEND_PATH%\src\components\MediaPipeProctor.jsx" (
    echo [✓] PASS: MediaPipe Proctor component found
    echo PASS: MediaPipe Proctor component found >> "%LOG_FILE%"
    set "MEDIAPIPE_PASS=1"
) else (
    echo [X] FAIL: MediaPipe Proctor component missing
    echo FAIL: MediaPipe Proctor component missing >> "%LOG_FILE%"
)

:: 6. Environment Variables Check
echo [*] Checking Environment Variables...
if exist "%PROJECT_ROOT%\.env" (
    set "ENV_PASS=1"
    echo [✓] PASS: Root .env file exists
    echo PASS: Root .env file exists >> "%LOG_FILE%"

    findstr /C:"JWT_SECRET=" "%PROJECT_ROOT%\.env" >nul
    if !ERRORLEVEL! equ 0 (
        echo [✓] PASS: JWT Secret key configured
        echo PASS: JWT Secret key configured >> "%LOG_FILE%"
        set "JWT_PASS=1"
    ) else (
        echo [X] FAIL: JWT Secret key missing in .env
        echo FAIL: JWT Secret key missing in .env >> "%LOG_FILE%"
    )

    findstr /C:"GEMINI_API_KEY=" "%PROJECT_ROOT%\.env" >nul
    if !ERRORLEVEL! equ 0 (
        echo [✓] PASS: Gemini API Key configured
        echo PASS: Gemini API Key configured >> "%LOG_FILE%"
        set "GEMINI_PASS=1"
    ) else (
        echo [X] FAIL: Gemini API Key missing in .env
        echo FAIL: Gemini API Key missing in .env >> "%LOG_FILE%"
    )
) else (
    echo [X] FAIL: Root .env file is missing
    echo FAIL: Root .env file is missing >> "%LOG_FILE%"
)

echo.
echo ============================================
echo SYSTEM HEALTH SUMMARY
echo ============================================
if %MYSQL_PASS% equ 1 (echo [✓] PASS: MySQL Service) else (echo [X] FAIL: MySQL Service)
if %DB_PASS% equ 1 (echo [✓] PASS: Database Connection) else (echo [X] FAIL: Database Connection)
if %BACKEND_PASS% equ 1 (echo [✓] PASS: Backend API) else (echo [X] FAIL: Backend API)
if %FRONTEND_PASS% equ 1 (echo [✓] PASS: Frontend UI) else (echo [X] FAIL: Frontend UI)
if %JWT_PASS% equ 1 (echo [✓] PASS: JWT Configured) else (echo [X] FAIL: JWT Configured)
if %GEMINI_PASS% equ 1 (echo [✓] PASS: Gemini API Configured) else (echo [X] FAIL: Gemini API Configured)
if %MEDIAPIPE_PASS% equ 1 (echo [✓] PASS: MediaPipe Proctor) else (echo [X] FAIL: MediaPipe Proctor)
if %ENV_PASS% equ 1 (echo [✓] PASS: Environment File) else (echo [X] FAIL: Environment File)
echo ============================================
echo Health check complete. Detailed logs saved to: %LOG_FILE%
echo.
pause
