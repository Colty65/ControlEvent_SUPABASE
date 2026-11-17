@echo off
setlocal
cd /d "%~dp0"
title ControlEvent - Configurar LOCAL

if not exist ".env" (
  > ".env" echo # ControlEvent LOCAL - NO SUBIR NI COMPARTIR ESTE FICHERO
  >> ".env" echo # Copia los mismos valores que tienes en Vercel ^> Environment Variables
  >> ".env" echo.
  >> ".env" echo SUPABASE_URL=PEGA_AQUI_TU_SUPABASE_URL
  >> ".env" echo SUPABASE_SERVICE_ROLE_KEY=PEGA_AQUI_TU_SERVICE_ROLE_KEY
  >> ".env" echo GEMINI_API_KEY=PEGA_AQUI_TU_GEMINI_API_KEY
  >> ".env" echo SUPABASE_TICKET_BUCKET=ticket-images
  >> ".env" echo PORT=3030
  echo.
  echo [OK] He creado .env.
) else (
  echo.
  echo [OK] .env ya existe. No se ha sobrescrito.
)

echo.
echo Se abrira el fichero .env en el Bloc de notas.
echo Copia SOLO en tu PC los valores desde Vercel. No me envies las claves.
echo Guarda el fichero y cierra el Bloc de notas.
echo.
start "" notepad.exe ".env"
pause
