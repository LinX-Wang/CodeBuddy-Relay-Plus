$p=Get-NetTCPConnection -LocalPort 3800 -State Listen -ErrorAction SilentlyContinue; if($p){Stop-Process -Id $p.OwningProcess -Force; Start-Sleep 1}; & (Join-Path $PSScriptRoot 'start-proxy.ps1')
