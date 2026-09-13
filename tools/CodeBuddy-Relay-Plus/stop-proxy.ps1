$p=Get-NetTCPConnection -LocalPort 3800 -State Listen -ErrorAction SilentlyContinue; if($p){Stop-Process -Id $p.OwningProcess -Force; Write-Host 'Stopped.'}else{Write-Host 'Not running.'}
