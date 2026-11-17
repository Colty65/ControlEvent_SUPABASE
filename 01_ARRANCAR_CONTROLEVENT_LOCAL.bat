@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title ControlEvent v5.0_exp - LOCAL SIN VERCEL

echo ================================================================
echo   ControlEvent LOCAL - Supabase real + Gemini real - SIN VERCEL
echo ================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [KO] No encuentro Node.js en este PC.
  echo Instala Node.js LTS y vuelve a ejecutar este BAT.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [KO] Falta .env.
  echo Voy a abrir el configurador. Rellena las 3 claves y vuelve aqui.
  call "00_CONFIGURAR_LOCAL.bat"
  exit /b 2
)

if not exist "node_modules\express\package.json" (
  echo [1/3] Primera ejecucion: instalando dependencias...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [KO] npm install ha fallado.
    pause
    exit /b 3
  )
) else (
  echo [1/3] Dependencias ya instaladas.
)

echo [2/3] Comprobando configuracion...
node scripts\local-preflight.cjs
if errorlevel 1 (
  echo.
  echo Abre 00_CONFIGURAR_LOCAL.bat, corrige .env y prueba otra vez.
  pause
  exit /b 4
)

echo [3/3] Arrancando ControlEvent en http://localhost:3030 ...
set "CE_PORT=3030"
for /f "tokens=1,* delims==" %%A in ('findstr /B /C:"PORT=" ".env" 2^>nul') do if not "%%B"=="" set "CE_PORT=%%B"

echo Liberando el puerto %CE_PORT% si quedo un servidor anterior...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-NetTCPConnection -LocalPort %CE_PORT% -State Listen -ErrorAction SilentlyContinue; if($p){$p ^| Select-Object -ExpandProperty OwningProcess -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 500}"

start "ControlEvent LOCAL - NO CERRAR" /D "%~dp0" cmd /k "npm run local"

timeout /t 2 /nobreak >nul
start "" "http://localhost:%CE_PORT%"

echo.
echo [OK] ControlEvent se ha abierto en el navegador.
echo La ventana negra "ControlEvent LOCAL - NO CERRAR" es el servidor.
echo Mientras uses localhost NO consumes CPU de Vercel.
echo Si usas Zuzu, SI consumes Gemini; y los datos/fotos siguen usando Supabase.
echo.
echo Para parar: cierra la ventana del servidor o ejecuta 02_PARAR_CONTROLEVENT_LOCAL.bat
pause
