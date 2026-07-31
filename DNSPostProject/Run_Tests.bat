@echo off
setlocal EnableDelayedExpansion
title Run Tests - AI Online Examination System
color 0D

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_PATH=%PROJECT_ROOT%\backend"
set "FRONTEND_PATH=%PROJECT_ROOT%\frontend"
set "LOG_DIR=%PROJECT_ROOT%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f "usebackq tokens=*" %%t in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set "TSTAMP=%%t"
set "LOG_FILE=%LOG_DIR%\Test_Log_%TSTAMP%.log"

echo ============================================
echo       RUNNING AUTOMATED TESTS
echo ============================================
echo.

set "START_TIME=%time%"
echo [*] Starting test execution at %START_TIME%
echo ---- Test Execution Log %date% %time% ---- > "%LOG_FILE%"

:: 1. Backend Tests
echo.
echo [*] Running Backend Tests...
cd /d "%BACKEND_PATH%"
call npm run test >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo [✓] Backend Tests: Passed
) else (
    echo [X] Backend Tests: Failed / Skipped
)

:: 2. Frontend Tests
echo.
echo [*] Running Frontend Tests...
cd /d "%FRONTEND_PATH%"
call npm run test >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo [✓] Frontend Tests: Passed
) else (
    echo [X] Frontend Tests: Failed / Skipped
)

:: 3. Playwright E2E Tests (if installed)
echo.
echo [*] Checking for Playwright E2E Tests...
cd /d "%PROJECT_ROOT%"
if exist "node_modules\@playwright\test" (
    echo [*] Running Playwright Tests...
    call npx playwright test >> "%LOG_FILE%" 2>&1
    if !ERRORLEVEL! equ 0 (
        echo [✓] Playwright Tests: Passed
    ) else (
        echo [X] Playwright Tests: Failed
    )
) else (
    echo [i] Playwright not installed. Skipping E2E tests.
    echo Playwright E2E skipped >> "%LOG_FILE%"
)

set "END_TIME=%time%"

echo.
echo ============================================
echo       TEST EXECUTION COMPLETE
echo ============================================
echo Start Time: %START_TIME%
echo End Time:   %END_TIME%
echo.
echo Detailed test logs saved to: %LOG_FILE%
echo ============================================
pause
