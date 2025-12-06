@echo off
cd /d "%~dp0"
echo Starting Post-Disaster Recovery IMS...
echo Ensure XAMPP (MySQL) is running!
start "" "http://localhost:3000/landing.html"
npm start
pause
