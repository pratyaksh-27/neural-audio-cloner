# NAC Studio: One-Click Setup Script
# Target: Windows 10/11

Write-Host "--- NAC Studio: Professional Setup Initializing ---" -ForegroundColor Cyan

# 1. PREREQUISITE CHECK
Write-Host "`n[1/5] Checking System Prerequisites..." -ForegroundColor Yellow

$python = Get-Command python -ErrorAction SilentlyContinue
if (!$python) { 
    Write-Error "Python not found. Please install Python 3.10+ and add it to PATH."
    exit 1 
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (!$node) { 
    Write-Error "Node.js not found. Please install Node.js v18+."
    exit 1 
}

Write-Host "   - Python and Node.js detected." -ForegroundColor Green

# 2. DIRECTORY STRUCTURE
Write-Host "`n[2/5] Creating Directory Structure..." -ForegroundColor Yellow
$folders = @("storage/uploads", "storage/voices", "storage/logs", "models/cache", "Tools")
foreach ($f in $folders) {
    if (!(Test-Path $f)) {
        New-Item -ItemType Directory -Path $f | Out-Null
        Write-Host "   - Created $f"
    }
}

# 3. FFMPEG AUTO-DOWNLOADER
Write-Host "`n[3/5] Resolving FFmpeg Dependency..." -ForegroundColor Yellow
$toolsDir = Join-Path (Get-Location) "Tools"
$ffmpegDir = Join-Path $toolsDir "ffmpeg"
$ffmpegExe = Join-Path $ffmpegDir "bin\ffmpeg.exe"

if (!(Test-Path $ffmpegExe)) {
    Write-Host "   - FFmpeg not found. Downloading essential binaries..." -ForegroundColor Gray
    $url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    $zipPath = Join-Path $toolsDir "ffmpeg.zip"
    
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    Write-Host "   - Extracting binaries..." -ForegroundColor Gray
    Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
    
    # Identify the extracted folder name
    $extractedFolder = Get-ChildItem -Path $toolsDir -Directory | Where-Object { $_.Name -like "ffmpeg-*" } | Select-Object -First 1
    Rename-Item -Path $extractedFolder.FullName -NewName "ffmpeg"
    
    Remove-Item $zipPath
    Write-Host "   - FFmpeg installed to local Tools directory." -ForegroundColor Green
} else {
    Write-Host "   - Local FFmpeg detected." -ForegroundColor Green
}

# 4. BACKEND SETUP (VENV)
Write-Host "`n[4/5] Setting up Python Environment (Backend)..." -ForegroundColor Yellow
cd backend
if (!(Test-Path "venv")) {
    Write-Host "   - Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "   - Installing heavy ML dependencies (this may take 2-5 mins)..." -ForegroundColor Gray
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# Create default config if missing
if (!(Test-Path "config.json")) {
    $defaultConfig = '{ "ffmpeg_path": "Tools/ffmpeg/bin/ffmpeg.exe" }'
    $defaultConfig | Out-File -FilePath "config.json" -Encoding utf8
}
cd ..

# 5. FRONTEND SETUP (NPM)
Write-Host "`n[5/5] Setting up Web Interface (Frontend)..." -ForegroundColor Yellow
cd frontend
Write-Host "   - Installing node modules..." -ForegroundColor Gray
npm install
cd ..

Write-Host "`n--- SETUP COMPLETE! ---" -ForegroundColor Green
Write-Host "You can now launch the studio using: .\scripts\start.ps1" -ForegroundColor Cyan
