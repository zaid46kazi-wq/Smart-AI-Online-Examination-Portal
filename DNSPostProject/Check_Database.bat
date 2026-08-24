@echo off
REM Database Connection Diagnostic & Startup Script
REM This script checks MySQL status and attempts to start it

setlocal enabledelayedexpansion
color 0A

echo.
echo ============================================================
echo       DATABASE CONNECTION DIAGNOSTIC TOOL
echo ============================================================
echo.

REM Check if port 3306 is listening
echo [*] Checking if MySQL port 3306 is listening...
netstat -ano 2>nul | findstr "3306" >nul
if %errorlevel% equ 0 (
    echo [✓] Port 3306 is LISTENING - MySQL is running!
    goto CheckConnection
) else (
    echo [X] Port 3306 is NOT listening - MySQL is NOT running
    echo.
)

REM Try to start MySQL service
echo [*] Attempting to start MySQL service...
echo.

REM Try MySQL 8.0
net start MySQL80 >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Successfully started MySQL80 service
    timeout /t 3 /nobreak
    goto CheckConnection
)

REM Try MySQL 5.7
net start MySQL57 >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Successfully started MySQL57 service
    timeout /t 3 /nobreak
    goto CheckConnection
)

REM Try MySQL 5.6
net start MySQL56 >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Successfully started MySQL56 service
    timeout /t 3 /nobreak
    goto CheckConnection
)

REM Try MariaDB
net start MariaDB >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Successfully started MariaDB service
    timeout /t 3 /nobreak
    goto CheckConnection
)

REM No service found
echo [!] ERROR: MySQL service not found or could not start
echo.
echo Possible solutions:
echo  1. Install MySQL Community Server 8.0 from:
echo     https://dev.mysql.com/downloads/mysql/
echo  2. Or install MariaDB from:
echo     https://mariadb.org/download/
echo  3. Or use Docker:
echo     docker run -e MYSQL_ROOT_PASSWORD=zaid7411310473 -p 3306:3306 -d mysql:8.0
echo.
goto End

:CheckConnection
echo.
echo [*] Checking database connection...
powershell -NoProfile -Command ^
  "$c = New-Object System.Net.Sockets.TcpClient; " ^
  "try { " ^
    "$c.Connect('127.0.0.1', 3306); " ^
    "Write-Host '[+] Connected to MySQL on 127.0.0.1:3306' -ForegroundColor Green; " ^
    "exit 0 " ^
  "} catch { " ^
    "Write-Host '[!] Connection failed: ' $_.Exception.Message -ForegroundColor Red; " ^
    "exit 1 " ^
  "} finally { $c.Close() }" >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo [✓] SUCCESS! Database is running and accessible
    echo.
    echo Next steps:
    echo  1. Navigate to: cd backend
    echo  2. Start backend: npm start
    echo  3. In another terminal, start frontend: cd frontend ^&^& npm start
    echo.
) else (
    echo [!] MySQL is listening but connection failed
    echo [!] Check credentials in .env file
    echo.
    echo Current config:
    echo  - Host: 127.0.0.1
    echo  - Port: 3306
    echo  - User: root
    echo  - Database: online_exam_system
    echo.
)

:End
echo.
echo Press any key to exit...
pause >nul
