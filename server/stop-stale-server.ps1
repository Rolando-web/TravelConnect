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
    [Parameter(Mandatory = $true)]
    [string]$ExePath
)

$ErrorActionPreference = 'SilentlyContinue'
$target = [System.IO.Path]::GetFullPath($ExePath)
$name = [System.IO.Path]::GetFileNameWithoutExtension($target)
$me = $PID

$stale = Get-Process -Name $name | Where-Object {
    if ($_.Id -eq $me) { return $false }
    try {
        [string]::Equals(
            [System.IO.Path]::GetFullPath($_.Path),
            $target,
            [System.StringComparison]::OrdinalIgnoreCase)
    } catch {
        $false
    }
}

if (-not $stale) { exit 0 }

# Kill the owning `dotnet run` parents FIRST. `dotnet run` supervises the app
# process and will respawn it if only the child .exe dies, so terminating the child
# alone just races a fresh instance against the build that is about to start.
$parents = @()
foreach ($p in $stale) {
    try {
        $ppid = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)").ParentProcessId
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$ppid" -ErrorAction SilentlyContinue
        if ($parent -and $parent.Name -eq 'dotnet.exe' -and $parent.CommandLine -match 'TravelConnect') {
            $parents += $parent
        }
    } catch { }
}

foreach ($pp in ($parents | Sort-Object ProcessId -Unique)) {
    Write-Host "[build] stopping previous 'dotnet run' host (PID $($pp.ProcessId))"
    Stop-Process -Id $pp.ProcessId -Force
}

foreach ($p in $stale) {
    Write-Host "[build] stopping previous server instance (PID $($p.Id))"
    Stop-Process -Id $p.Id -Force
}

# Wait for the OS to actually release the file handles and the listening socket.
$deadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $deadline) {
    if (-not (Get-Process -Name $name | Where-Object {
            try {
                [string]::Equals([System.IO.Path]::GetFullPath($_.Path), $target, [System.StringComparison]::OrdinalIgnoreCase)
            } catch { $false }
        })) {
        break
    }
    Start-Sleep -Milliseconds 200
}

exit 0
