$ErrorActionPreference = 'Stop'
$Project = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent; $Port = 3800
$p = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($p) { Stop-Process -Id $p.OwningProcess -Force; Start-Sleep 1 }
& (Join-Path $PSScriptRoot '启动代理.ps1')
