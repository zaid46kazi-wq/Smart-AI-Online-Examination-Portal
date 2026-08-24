@echo off
setlocal EnableDelayedExpansion
title Stop AI Online Examination System
color 0C

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

if exist "%ROOT_DIR%\DNSPostProject\Stop_Project.bat" (
    cd /d "%ROOT_DIR%\DNSPostProject"
    call "%ROOT_DIR%\DNSPostProject\Stop_Project.bat" %*
) else (
    echo [X] Error: Could not find DNSPostProject\Stop_Project.bat in %ROOT_DIR%
    pause
    exit /b 1
)
