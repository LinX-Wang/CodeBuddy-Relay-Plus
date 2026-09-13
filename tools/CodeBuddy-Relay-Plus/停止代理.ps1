$p = Get-NetTCPConnection -LocalPort 3800 -State Listen -ErrorAction SilentlyContinue
if ($p) { Stop-Process -Id $p.OwningProcess -Force; Write-Host "代理已停止" -ForegroundColor Green } else { Write-Host "代理当前未运行" -ForegroundColor Yellow }
