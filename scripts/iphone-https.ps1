$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$port = 3030
if ($env:PORT) { $port = [int]$env:PORT }
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT\s*=' } | Select-Object -First 1
  if ($line) {
    $v = ($line -split '=',2)[1].Trim()
    if ($v -match '^\d+$') { $port = [int]$v }
  }
}

Write-Host ""
Write-Host "=== ControlEvent -> iPhone por HTTPS ===" -ForegroundColor Cyan
Write-Host "Servidor local: http://localhost:$port"

$health = "http://127.0.0.1:$port/api/health"
$serverAlreadyRunning = $false
try {
  $r = Invoke-WebRequest -UseBasicParsing -Uri $health -TimeoutSec 2
  if ($r.StatusCode -eq 200) { $serverAlreadyRunning = $true }
} catch {}

$server = $null
if (-not $serverAlreadyRunning) {
  Write-Host "Arrancando ControlEvent local..." -ForegroundColor Yellow
  $server = Start-Process -FilePath "node" -ArgumentList "scripts/dev-server-supabase.js" -WorkingDirectory $root -PassThru -NoNewWindow
  $ok = $false
  for ($i=0; $i -lt 25; $i++) {
    Start-Sleep -Milliseconds 400
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $health -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
  }
  if (-not $ok) {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
    throw "ControlEvent no ha arrancado en el puerto $port."
  }
} else {
  Write-Host "ControlEvent ya estaba arrancado." -ForegroundColor Green
}

$tools = Join-Path $root "tools"
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$cf = Join-Path $tools "cloudflared.exe"

if (-not (Test-Path $cf)) {
  Write-Host "Descargando cloudflared (solo la primera vez)..." -ForegroundColor Yellow
  $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $cf
}

Write-Host ""
Write-Host "Creando URL HTTPS temporal..." -ForegroundColor Yellow
Write-Host "IMPORTANTE: deja esta ventana abierta mientras uses el iPhone." -ForegroundColor Cyan
Write-Host "En el iPhone abre Safari, entra en la URL https:// que aparecerá abajo y permite MICROFONO." -ForegroundColor Cyan
Write-Host ""

try {
  & $cf tunnel --url "http://127.0.0.1:$port" --no-autoupdate
} finally {
  if ($server -and -not $server.HasExited) {
    Write-Host "Cerrando servidor local..." -ForegroundColor Yellow
    Stop-Process -Id $server.Id -Force
  }
}
