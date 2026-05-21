# Neural Audio Cloner - Safe Startup Script

$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"
$pidFile = Join-Path $scriptDir ".app.pids"

Write-Host "Neural Audio Cloner: Resource-Safe Startup" -ForegroundColor Cyan

# 1. System Health Check
Write-Host "Checking system resources..." -ForegroundColor Yellow
$ollama = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($ollama) {
    Write-Host "WARNING: Ollama is running! This will likely crash your 4GB GPU." -ForegroundColor Red
    Write-Host "Please close Ollama before proceeding." -ForegroundColor White
    $choice = Read-Host "Proceed anyway? (y/n)"
    if ($choice -ne 'y') { exit }
}

# Clear old PIDs
if (Test-Path $pidFile) { Remove-Item $pidFile }

function Start-Tracked($title, $cmd, $dir, $noExit=$false) {
    $exitFlag = if ($noExit) { "-NoExit" } else { "" }
    $fullCmd = "`$host.UI.RawUI.WindowTitle='$title'; cd '$dir'; $cmd"
    $proc = Start-Process powershell -ArgumentList "-NoProfile $exitFlag -Command `"$fullCmd`"" -PassThru
    $proc.Id | Out-File $pidFile -Append
    return $proc.Id
}

# 2. Start ML Worker (Exclusive GPU Access)
Write-Host "Starting ML Worker (Stage 1/3)..." -ForegroundColor Cyan
Start-Tracked "NAC_ML_Worker" "& '$pythonExe' ml_worker.py" $backendDir $true

# IMPORTANT: Wait 15 seconds for the GPU to finish loading the model
# and for the disk IO to settle down before starting anything else.
Write-Host "Waiting 15s for GPU Initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 3. Start API Server (CPU Only)
Write-Host "Starting API Server (Stage 2/3)..." -ForegroundColor Cyan
Start-Tracked "NAC_API_Server" "& '$pythonExe' api_server.py" $backendDir $true
Start-Sleep -Seconds 5

# 4. Start Frontend
Write-Host "Starting Frontend (Stage 3/3)..." -ForegroundColor Cyan
Start-Tracked "NAC_Frontend" "npm run dev" $frontendDir $false

Write-Host "`nAll components launched." -ForegroundColor Green
Write-Host "1. Monitor 'NAC_ML_Worker' until it says 'READY'." -ForegroundColor White
Write-Host "2. Then open http://localhost:5173" -ForegroundColor White
