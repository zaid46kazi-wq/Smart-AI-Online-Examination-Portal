@echo off
cd /d "D:\6th Sem\PP-1\~Projectonline Examination system-EnggRoom.Com\DNSPostProject"

echo Installing Jest...
call npm install jest --save-dev

echo.
echo Running tests...
call npm test

echo.
echo Test run completed!
pause
