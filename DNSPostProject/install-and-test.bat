@echo off
setlocal enabledelayedexpansion

cd /d "D:\6th Sem\PP-1\~Projectonline Examination system-EnggRoom.Com\DNSPostProject"

echo.
echo ========================================
echo Installing Jest (dev dependency)...
echo ========================================
call npm install jest --save-dev

if errorlevel 1 (
    echo Error installing Jest
    pause
    exit /b 1
)

echo.
echo ========================================
echo Running Tests...
echo ========================================
call npm test

if errorlevel 0 (
    echo.
    echo ========================================
    echo Tests completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Tests completed with errors
    echo ========================================
)

pause
