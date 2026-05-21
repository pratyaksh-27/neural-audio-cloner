# Neural Audio Cloner - PID-Based Stop Script

$scriptDir = $PSScriptRoot
$pidFile = Join-Path $scriptDir ".app.pids"
$currentPid = $PID

Write-Host "Shutting down Neural Audio Cloner..." -ForegroundColor Cyan

if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile
    foreach ($p in $pids) {
        $p = $p.Trim()
        if ($p -and $p -ne $currentPid) {
            Write-Host "Terminating process tree for PID: $p" -ForegroundColor Yellow
            # /F = Force, /T = Tree (kills children like python.exe), /PID = process id
            & taskkill.exe /F /T /PID $p 2>$null
        }
    }
    Remove-Item $pidFile
}

# Fallback: Catch any orphaned python/node processes from this project
$orphans = Get-WmiObject Win32_Process | Where-Object { 
    ($_.Name -match "python|node") -and ($_.CommandLine -like "*neural-audio-cloner*") 
}

foreach ($o in $orphans) {
    Write-Host "Cleaning orphaned process: $($o.Name) (PID: $($o.ProcessId))" -ForegroundColor Red
    & taskkill.exe /F /T /PID $o.ProcessId 2>$null
}

Write-Host "All windows and processes closed." -ForegroundColor Green
