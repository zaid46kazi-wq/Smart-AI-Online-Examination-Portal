@echo off
REM Run as Administrator - This file must be run with admin privileges
REM If you see "Access Denied", right-click this file and select "Run as administrator"

setlocal
title Starting MySQL Database Service...
color 0A

echo.
echo ============================================================
echo       STARTING MYSQL80 SERVICE
echo ============================================================
echo.

REM Attempt to start the service
echo [*] Starting MySQL80 service...
net start MySQL80

if %errorlevel% equ 0 (
    echo.
    echo [✓] SUCCESS! MySQL80 has been started
    echo.
    timeout /t 2
) else (
    echo.
    echo [!] ERROR: Could not start MySQL80
    echo [!] Make sure you ran this file as Administrator!
    echo.
    echo To run as Administrator:
    echo  1. Right-click this file
    echo  2. Click "Run as administrator"
    echo  3. Click "Yes" when prompted
    echo.
    timeout /t 10
    exit /b 1
)

REM Verify connection
echo [*] Verifying MySQL connection...
powershell -NoProfile -Command ^
  "$c = New-Object System.Net.Sockets.TcpClient; " ^
  "try { " ^
    "$c.Connect('127.0.0.1', 3306); " ^
    "Write-Host '[✓] MySQL is accessible on 127.0.0.1:3306' -ForegroundColor Green; " ^
    "exit 0 " ^
  "} catch { " ^
    "Write-Host '[!] MySQL not yet accessible' -ForegroundColor Yellow; " ^
    "exit 1 " ^
  "} finally { $c.Close() }" >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo       DATABASE IS READY!
    echo ============================================================
    echo.
    echo You can now start your backend server:
    echo.
    echo   cd backend
    echo   npm start
    echo.
    echo And your frontend in another terminal:
    echo.
    echo   cd frontend
    echo   npm start
    echo.
)

pause
