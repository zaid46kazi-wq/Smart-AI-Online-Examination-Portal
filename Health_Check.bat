@echo off
setlocal EnableDelayedExpansion
title System Health Check - AI Online Examination System
color 0B

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

if exist "%ROOT_DIR%\DNSPostProject\Health_Check.bat" (
    cd /d "%ROOT_DIR%\DNSPostProject"
    call "%ROOT_DIR%\DNSPostProject\Health_Check.bat" %*
) else (
    echo [X] Error: Could not find DNSPostProject\Health_Check.bat in %ROOT_DIR%
    pause
    exit /b 1
)
