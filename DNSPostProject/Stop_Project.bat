@echo off
setlocal EnableDelayedExpansion
title Stop AI Online Examination System
color 0C

set "BACKEND_PORT=5000"
set "FRONTEND_PORT=5174"

if /I "%~1" equ "/Q" goto SkipConfirm

echo ============================================
echo       STOP PROJECT SERVICES
echo ============================================
echo.
echo WARNING: This will terminate the Backend and Frontend node servers.
echo MySQL database will be left running.
echo.

set /p CONFIRM="Are you sure you want to stop the project services? (Y/N): "
if /I "%CONFIRM%" neq "Y" (
    echo.
    echo Operation cancelled. Services are still running.
    pause
    exit /b 0
)

:SkipConfirm

echo.
echo [*] Terminating Node.js Backend and Frontend processes...

:: 1. Terminate process bound to Backend Port (5000)
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue; foreach ($conn in $c) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 2. Terminate process bound to Frontend Port (5174 and 5173)
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort %FRONTEND_PORT%,5173 -ErrorAction SilentlyContinue; foreach ($conn in $c) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 3. Terminate launched launcher windows by title
taskkill /F /FI "WINDOWTITLE eq Backend API Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend UI Server*" >nul 2>&1

echo [✓] Backend service (Port %BACKEND_PORT%) stopped.
echo [✓] Frontend service (Port %FRONTEND_PORT%) stopped.
echo [✓] Project CMD windows closed.
echo [i] MySQL service left intact.

if /I "%~1" neq "/Q" (
    echo.
    echo ============================================
    echo All project services have been stopped.
    echo ============================================
    pause
)
