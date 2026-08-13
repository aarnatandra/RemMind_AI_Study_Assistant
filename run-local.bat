@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "RemMind Study Hub server" cmd /k py -m http.server 8000
) else (
  start "RemMind Study Hub server" cmd /k python -m http.server 8000
)
timeout /t 2 /nobreak >nul
start "" http://localhost:8000
echo RemMind Study Hub is running at http://localhost:8000
echo Keep the server window open while you use the application.
pause >nul
