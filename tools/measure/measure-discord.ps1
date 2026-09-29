<#
.SYNOPSIS
  Samples Discord's resource usage on Windows and writes a CSV + summary.
  Read-only: it does not modify Discord. Everything stays local.

.EXAMPLE
  .\measure-discord.ps1 -Label baseline -DurationSec 300 -IntervalSec 5
  .\measure-discord.ps1 -Label blur-off -DurationSec 300 -ProcessName DiscordCanary

.NOTES
  WorkingSet = physical memory currently held; PrivateBytes = memory not shared
  with other processes (closer to real cost). Both are reported, summed over all
  Discord processes. CPU% is normalised to total logical cores (100% = whole machine).
#>
param(
    [string]$Label = "run",
    [int]$DurationSec = 300,
    [int]$IntervalSec = 5,
    [string]$ProcessName = "Discord",   # DiscordPTB / DiscordCanary for other channels
    [string]$OutDir = "$PSScriptRoot\results"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$cores = [Environment]::ProcessorCount
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$csv = Join-Path $OutDir "$Label-$stamp.csv"
$rows = New-Object System.Collections.Generic.List[object]

function Get-Snapshot {
    $procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if (-not $procs) { throw "No process named '$ProcessName' found. Is Discord running?" }
    $cpu = 0.0; $ws = 0L; $priv = 0L
    foreach ($p in $procs) {
        try {
            $cpu += $p.TotalProcessorTime.TotalSeconds
            $ws += $p.WorkingSet64
            $priv += $p.PrivateMemorySize64
        } catch { }   # process exited between listing and reading
    }
    [pscustomobject]@{ Cpu = $cpu; WorkingSetMB = $ws / 1MB; PrivateMB = $priv / 1MB; Count = @($procs).Count }
}

Write-Host "Sampling '$ProcessName' for $DurationSec s every $IntervalSec s (label: $Label)"
$prev = Get-Snapshot
$prevTime = Get-Date
$end = $prevTime.AddSeconds($DurationSec)

while ((Get-Date) -lt $end) {
    Start-Sleep -Seconds $IntervalSec
    $now = Get-Date
    $cur = Get-Snapshot
    $elapsed = ($now - $prevTime).TotalSeconds
    # CPU time can drop if a process exited; clamp at 0.
    $cpuPct = [math]::Max(0, ($cur.Cpu - $prev.Cpu) / ($elapsed * $cores) * 100)
    $rows.Add([pscustomobject]@{
        Time         = $now.ToString("s")
        Processes    = $cur.Count
        CpuPercent   = [math]::Round($cpuPct, 2)
        WorkingSetMB = [math]::Round($cur.WorkingSetMB, 1)
        PrivateMB    = [math]::Round($cur.PrivateMB, 1)
    })
    $prev = $cur; $prevTime = $now
}

$rows | Export-Csv -NoTypeInformation -Path $csv

function Get-Slope($values) {
    # Least-squares slope per sample, to expose memory growth over time.
    $n = $values.Count; if ($n -lt 2) { return 0 }
    $xm = ($n - 1) / 2; $ym = ($values | Measure-Object -Average).Average
    $num = 0.0; $den = 0.0
    for ($i = 0; $i -lt $n; $i++) { $num += ($i - $xm) * ($values[$i] - $ym); $den += [math]::Pow($i - $xm, 2) }
    if ($den -eq 0) { 0 } else { $num / $den }
}

$cpuS = $rows | Measure-Object CpuPercent -Average -Maximum
$wsS = $rows | Measure-Object WorkingSetMB -Average -Maximum
$prS = $rows | Measure-Object PrivateMB -Average -Maximum
$slope = (Get-Slope ($rows | ForEach-Object { $_.PrivateMB })) * (60 / $IntervalSec)

Write-Host ""
Write-Host "=== Summary ($Label, $($rows.Count) samples) ==="
Write-Host ("CPU %        avg {0:N2}  max {1:N2}" -f $cpuS.Average, $cpuS.Maximum)
Write-Host ("WorkingSet   avg {0:N0} MB  max {1:N0} MB" -f $wsS.Average, $wsS.Maximum)
Write-Host ("PrivateBytes avg {0:N0} MB  max {1:N0} MB" -f $prS.Average, $prS.Maximum)
Write-Host ("Private memory trend: {0:N2} MB/min" -f $slope)
Write-Host "CSV: $csv"
