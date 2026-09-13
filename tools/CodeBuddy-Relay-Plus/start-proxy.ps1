$ErrorActionPreference='Stop'; $Project=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent; $Data=Join-Path $env:USERPROFILE '.codebuddy-proxy'; Set-Location $Project
if(Test-Path $Data){icacls $Data /grant "$env:USERNAME`:(OI)(CI)M" /T | Out-Null}
$p=Get-NetTCPConnection -LocalPort 3800 -State Listen -ErrorAction SilentlyContinue; if($p){Write-Host "Already running PID $($p.OwningProcess)"; exit 0}
npm run build
Start-Process node.exe -ArgumentList 'server.js' -WorkingDirectory $Project -WindowStyle Hidden
Start-Sleep 3; if(!(Get-NetTCPConnection -LocalPort 3800 -State Listen -ErrorAction SilentlyContinue)){throw 'Start failed: port 3800 is not listening'}; Write-Host 'CodeBuddy Relay Plus started.'
