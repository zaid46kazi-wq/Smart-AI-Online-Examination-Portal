@echo off
REM Start the Online Examination System Development Server
REM This batch file starts the Node.js server

cd /d "D:\6th Sem\PP-1\~Projectonline Examination system-EnggRoom.Com\DNSPostProject"

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║       Online Examination System - Development Server              ║
echo ║              AGMR College of Engineering                          ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo Starting server...
echo.

REM Start the Node.js server
call node server.js

REM This will keep running until manually stopped (Ctrl+C)
