@echo off
REM MySQL Installation & Startup Assistant for Windows
REM Detects MySQL, starts service, or guides installation

setlocal enabledelayedexpansion
color 0A
title MySQL Database Setup Assistant

echo.
echo ============================================================
echo       MYSQL INSTALLATION ^& STARTUP ASSISTANT
echo ============================================================
echo.

REM Step 1: Check if MySQL is already installed
echo [*] Checking for installed MySQL versions...
echo.

set "MYSQL_FOUND=0"
set "MYSQL_VERSION="
set "MYSQL_SERVICE="

REM Check for MySQL 8.0
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" (
    echo [+] Found MySQL Server 8.0
    set "MYSQL_FOUND=1"
    set "MYSQL_VERSION=8.0"
    set "MYSQL_SERVICE=MySQL80"
)

REM Check for MySQL 5.7
if exist "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqld.exe" (
    echo [+] Found MySQL Server 5.7
    set "MYSQL_FOUND=1"
    set "MYSQL_VERSION=5.7"
    set "MYSQL_SERVICE=MySQL57"
)

REM Check for MySQL 5.6
if exist "C:\Program Files\MySQL\MySQL Server 5.6\bin\mysqld.exe" (
    echo [+] Found MySQL Server 5.6
    set "MYSQL_FOUND=1"
    set "MYSQL_VERSION=5.6"
    set "MYSQL_SERVICE=MySQL56"
)

if %MYSQL_FOUND% equ 0 (
    echo [X] MySQL not found in default installation path
    echo.
    goto InstallGuide
)

echo.
echo [✓] MySQL version !MYSQL_VERSION! detected with service: !MYSQL_SERVICE!
echo.

REM Step 2: Try to start MySQL service
echo [*] Attempting to start !MYSQL_SERVICE! service...
echo.

net start "!MYSQL_SERVICE!" >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] SUCCESS! !MYSQL_SERVICE! service started!
    echo.
    goto VerifyConnection
)

REM Service might already be running
net start "!MYSQL_SERVICE!" 2>&1 | findstr /i "already running" >nul
if %errorlevel% equ 0 (
    echo [✓] !MYSQL_SERVICE! is already running
    echo.
    goto VerifyConnection
)

REM Could not start - requires admin
echo [!] ERROR: Could not start !MYSQL_SERVICE! service
echo.
echo Reason: This script needs Administrator privileges
echo.
echo Solution:
echo  1. Right-click on this script file
echo  2. Select "Run as administrator"
echo  3. Try again
echo.
pause
exit /b 1

:VerifyConnection
echo [*] Verifying database connection...
powershell -NoProfile -Command ^
  "$c = New-Object System.Net.Sockets.TcpClient; " ^
  "try { " ^
    "$c.Connect('127.0.0.1', 3306); " ^
    "Write-Host '[✓] Successfully connected to MySQL on 127.0.0.1:3306' -ForegroundColor Green; " ^
    "exit 0 " ^
  "} catch { " ^
    "Write-Host '[!] Connection failed: ' $_.Exception.Message -ForegroundColor Red; " ^
    "exit 1 " ^
  "} finally { $c.Close() }" >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo       [✓] MYSQL IS READY!
    echo ============================================================
    echo.
    echo Your database configuration:
    echo  - Host: 127.0.0.1
    echo  - Port: 3306
    echo  - User: root
    echo  - Database: online_exam_system
    echo.
    echo Next steps:
    echo  1. Open new terminal and navigate to: cd backend
    echo  2. Start backend server: npm start
    echo  3. In another terminal, navigate to: cd frontend
    echo  4. Start frontend: npm start
    echo  5. Open browser to http://localhost:5174
    echo.
) else (
    echo.
    echo [!] MySQL service started but connection test failed
    echo [!] Check your .env configuration:
    echo.
    type .env | findstr "DB_"
    echo.
)

pause
exit /b 0

:InstallGuide
echo ============================================================
echo       MYSQL NOT FOUND - INSTALLATION REQUIRED
echo ============================================================
echo.
echo Follow these steps to install MySQL on Windows:
echo.
echo [STEP 1] Download Installer
echo   - Visit: https://dev.mysql.com/downloads/mysql/
echo   - Click "Download" for "Windows (x86, 64-bit), MSI Installer"
echo   - Choose "No thanks, just start my download"
echo.
echo [STEP 2] Run the Installer
echo   - Double-click "mysql-8.0.x-winx64.msi"
echo   - Select Setup Type: "Developer Default"
echo   - Click Next through license and prerequisites
echo   - Installation path: C:\Program Files\MySQL\MySQL Server 8.0
echo.
echo [STEP 3] MySQL Server Configuration Wizard
echo   - Config Type: "Standalone MySQL Server / MySQL Router"
echo   - MySQL Port: 3306 (default - IMPORTANT!)
echo   - Check: "Configure MySQL Server as a Windows Service"
echo   - Service Name: MySQL80
echo.
echo [STEP 4] Authentication & Logging
echo   - Authentication Method: "Use Legacy Authentication Plugin"
echo   - (This is important for compatibility)
echo.
echo [STEP 5] Accounts & Roles
echo   - Root Password: zaid7411310473
echo   - ⚠️ THIS MUST MATCH YOUR .env FILE!
echo.
echo [STEP 6] Complete Setup
echo   - Click Next → Finish
echo   - MySQL should start automatically
echo.
echo [STEP 7] Verify Installation
echo   - Run this script again as Administrator
echo   - It should detect MySQL and start the service
echo.
echo Questions?
echo   - MySQL Docs: https://dev.mysql.com/doc/mysql-installation-excerpt/8.0/en/
echo   - If installer fails, make sure you have 200MB free disk space
echo.
pause
