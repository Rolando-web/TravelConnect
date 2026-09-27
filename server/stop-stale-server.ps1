# Stops a previously-launched instance of this exact server binary so that a rebuild
# can overwrite TravelConnect.Server.exe.
#
# Why this exists: a running .NET app locks its own .exe/.dll. A second `dotnet run`
# therefore fails *during the build* with MSB3021 ("TravelConnect.Server.exe ... is
# being used by another process"), and if the build is a no-op it fails a moment later
# with AddressInUseException when Kestrel binds :5110. Neither failure can be handled
# from inside the app, because the app cannot start until the build succeeds.
#
# The match is deliberately narrow: only processes whose executable path is exactly
# the -ExePath passed in are stopped. Any other process holding the port is left
# running and reported instead.
param(
    [string]$ExePath = ""
)

$ErrorActionPreference = 'SilentlyContinue'

$target = ""
$targetExe = ""
$targetDll = ""
$name = "TravelConnect.Server"

if ($ExePath) {
    try {
        $target = [System.IO.Path]::GetFullPath($ExePath)
        $name = [System.IO.Path]::GetFileNameWithoutExtension($target)
        $targetExe = [System.IO.Path]::ChangeExtension($target, ".exe")
        $targetDll = [System.IO.Path]::ChangeExtension($target, ".dll")
    } catch { }
}

$me = $PID

# 1. Match any process matching the target binary or server process name
$stale = Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object {
    if ($_.Id -eq $me) { return $false }
    if (-not $target) { return $true }
    try {
        if ($_.Path) {
            $p = [System.IO.Path]::GetFullPath($_.Path)
            return ([string]::Equals($p, $target, [System.StringComparison]::OrdinalIgnoreCase) -or
                    [string]::Equals($p, $targetExe, [System.StringComparison]::OrdinalIgnoreCase) -or
                    [string]::Equals($p, $targetDll, [System.StringComparison]::OrdinalIgnoreCase))
        }
    } catch { }
    return $true
}

# 2. Check if port 5110 or 7241 is held by another process
$portProcesses = @()
foreach ($port in @(5110, 7241)) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            if ($conn.OwningProcess -and $conn.OwningProcess -ne $me) {
                $portProc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($portProc) {
                    $portProcesses += $portProc
                }
            }
        }
    } catch { }
}

$allToStop = @($stale) + @($portProcesses) | Where-Object { $_ -ne $null } | Sort-Object Id -Unique

if (-not $allToStop -or $allToStop.Count -eq 0) { exit 0 }

# 3. Kill the owning dotnet run parents first so they do not auto-restart
$parents = @()
foreach ($p in $allToStop) {
    try {
        $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction SilentlyContinue
        if ($procInfo -and $procInfo.ParentProcessId) {
            $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($procInfo.ParentProcessId)" -ErrorAction SilentlyContinue
            if ($parent -and $parent.Name -match 'dotnet' -and $parent.CommandLine -match 'TravelConnect') {
                $parents += $parent
            }
        }
    } catch { }
}

foreach ($pp in ($parents | Sort-Object ProcessId -Unique)) {
    Write-Host "[build] Stopping previous 'dotnet run' host (PID $($pp.ProcessId))..."
    Stop-Process -Id $pp.ProcessId -Force -ErrorAction SilentlyContinue
}

foreach ($p in $allToStop) {
    Write-Host "[build] Stopping previous server instance (PID $($p.Id))..."
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}

# 4. Wait for the OS to release the file handles and the listening socket
$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
    $remaining = Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $me }
    if (-not $remaining) { break }
    Start-Sleep -Milliseconds 150
}

exit 0
