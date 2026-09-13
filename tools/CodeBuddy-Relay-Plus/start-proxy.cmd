@echo off
setlocal
set "PROJECT=%~dp0..\.."
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$ErrorActionPreference='Stop'; $d=Join-Path $env:USERPROFILE '.codebuddy-proxy'; if(Test-Path $d){icacls $d /grant ($env:USERNAME+':(OI)(CI)M')|Out-Null}; Set-Location '%PROJECT%'; npm run build; $p=Get-NetTCPConnection -LocalPort 3800 -State Listen -ErrorAction SilentlyContinue; if(!$p){Start-Process node.exe -ArgumentList 'server.js' -WorkingDirectory '%PROJECT%' -WindowStyle Hidden; Start-Sleep 3};"
