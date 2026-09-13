$ErrorActionPreference = 'Stop'
$Project = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Data = Join-Path $env:USERPROFILE '.codebuddy-proxy'
$Port = 3800
Set-Location $Project
if (Test-Path $Data) { icacls $Data /grant "$env:USERNAME`:(OI)(CI)M" /T | Out-Null }
$old = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($old) { Write-Host "代理已在运行，PID=$($old.OwningProcess)" -ForegroundColor Yellow; exit 0 }
if (!(Test-Path (Join-Path $Project 'dist\index.html'))) { npm run build }
$log = Join-Path $PSScriptRoot 'proxy.log'; $err = Join-Path $PSScriptRoot 'proxy-error.log'
Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory $Project -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden
Start-Sleep 3
$check = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (!$check) { throw '代理启动失败，请查看 proxy.log' }
Write-Host "CodeBuddy Relay Plus 已启动: http://127.0.0.1:$Port" -ForegroundColor Green
