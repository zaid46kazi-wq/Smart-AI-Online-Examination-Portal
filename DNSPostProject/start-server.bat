@echo off
REM =============================================================
REM Online Examination System - Quick Start
REM =============================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  Online Examination System - Quick Start                 ║
echo ║  AGMR College of Engineering                             ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if compression and rate-limit are installed
node -e "require('compression')" >nul 2>&1
if errorlevel 1 (
    echo Installing performance optimizations...
    call npm install compression express-rate-limit
    echo.
)

echo Starting server...
echo.
echo Server will be available at: http://localhost:3000
echo.
echo To stop the server, press Ctrl+C
echo.

REM Start the server
node server.js

pause
