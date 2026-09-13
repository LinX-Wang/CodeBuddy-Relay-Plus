@echo off
cd /d "%~dp0"

netstat -ano | findstr ":3800 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    start "" "http://127.0.0.1:3800/home"
    exit /b 0
)

start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$env:CODEBUDDY_NO_OPEN='1'; Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
timeout /t 3 /nobreak >nul

netstat -ano | findstr ":3800 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    start "" "http://127.0.0.1:3800/home"
) else (
    exit /b 1
)
exit /b 0
