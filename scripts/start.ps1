# NAC Studio: Professional Startup Script
# Targets: Windows 10/11 (Pascal GPU Optimized)

Write-Host "--- NAC Studio v2.0.0: Professional Launch ---" -ForegroundColor Cyan

$PID_FILE = ".app.pids"
if (Test-Path $PID_FILE) { Remove-Item $PID_FILE }

# 1. Start ML Worker (GPU Process)
Write-Host "[1/3] Starting ML Worker (GPU)..." -ForegroundColor Yellow
$worker = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd backend; .\venv\Scripts\python.exe ml_worker.py; Read-Host 'Press Enter to exit...'" -PassThru -WindowStyle Normal
$worker.Id | Out-File -FilePath $PID_FILE -Append

Start-Sleep -Seconds 2

# 2. Start API Server (CPU Process)
Write-Host "[2/3] Starting API Server (CPU)..." -ForegroundColor Yellow
$api = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd backend; .\venv\Scripts\python.exe api_server.py" -PassThru -WindowStyle Normal
$api.Id | Out-File -FilePath $PID_FILE -Append

# 3. Start Frontend (Vite)
Write-Host "[3/3] Starting Studio UI..." -ForegroundColor Yellow
$web = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd frontend; npm run dev" -PassThru -WindowStyle Normal
$web.Id | Out-File -FilePath $PID_FILE -Append

Write-Host "`n--- NAC STUDIO v2.0.0 ACTIVE ---" -ForegroundColor Green
Write-Host "URL: http://localhost:5173" -ForegroundColor Gray
Write-Host "Use stop.ps1 to shutdown safely." -ForegroundColor Gray
