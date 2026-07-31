@echo off
setlocal EnableDelayedExpansion
title Restart AI Online Examination System
color 0E

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo ============================================
echo       RESTART PROJECT SERVICES
echo ============================================
echo.
echo [*] Stopping existing services silently...
call "%PROJECT_ROOT%\Stop_Project.bat" /Q

echo.
echo [*] Starting project launcher...
call "%PROJECT_ROOT%\Start_Project.bat"
