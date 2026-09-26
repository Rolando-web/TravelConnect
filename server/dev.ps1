# Runs TravelConnect Server without ever hitting "address already in use / port 5110".
# Any leftover background instance (Start-Process'd or orphaned) is stopped first, then `dotnet run` runs attached (Ctrl+C to stop).
#
# Usage (from repo root):   .\server\dev.ps1
# Kill leftover instances only (no run):   .\server\dev.ps1 -StopOnly
param([switch]$StopOnly)

$project = Join-Path $PSScriptRoot "TravelConnect.Server\TravelConnect.Server.csproj"

function Stop-Stale {
    Get-NetTCPConnection -LocalPort 5110 -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

    Get-Process -Name "TravelConnect.Server" -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue

    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq "dotnet.exe" -and $_.CommandLine -match "TravelConnect.Server" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    Start-Sleep -Milliseconds 800
}

Stop-Stale

if (Get-NetTCPConnection -LocalPort 5110 -State Listen -ErrorAction SilentlyContinue) {
    Write-Error "Port 5110 is still bound after cleanup. Run as Administrator."
    exit 1
}

Write-Host "Port 5110 free. Running TravelConnect Server (Ctrl+C to stop)..."
if (-not $StopOnly) {
    dotnet run -c Debug --project $project
}