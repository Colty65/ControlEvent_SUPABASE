@echo off
setlocal
cd /d "%~dp0"
title ControlEvent - Parar LOCAL

set "CE_PORT=3030"
for /f "tokens=1,* delims==" %%A in ('findstr /B /C:"PORT=" ".env" 2^>nul') do if not "%%B"=="" set "CE_PORT=%%B"
echo Buscando el proceso que escucha en el puerto %CE_PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-NetTCPConnection -LocalPort %CE_PORT% -State Listen -ErrorAction SilentlyContinue; if($p){$p ^| Select-Object -ExpandProperty OwningProcess -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host '[OK] Servidor local detenido.'} else {Write-Host '[OK] No habia servidor local activo.'}"
pause
