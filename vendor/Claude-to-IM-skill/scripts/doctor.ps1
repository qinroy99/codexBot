param(
  [int]$LogLines = 80
)

$ErrorActionPreference = 'Continue'
$ctiHome = Join-Path $env:USERPROFILE '.claude-to-im'
$configPath = Join-Path $ctiHome 'config.env'
$logPath = Join-Path $ctiHome 'logs\bridge.log'
$statusPath = Join-Path $ctiHome 'runtime\status.json'
$skillDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

Write-Host 'Claude-to-IM Doctor' -ForegroundColor Cyan
Write-Host ''

$checks = @(
  @{ Name = 'node'; Command = 'node.exe' },
  @{ Name = 'npm'; Command = 'npm.cmd' },
  @{ Name = 'git'; Command = 'git.exe' },
  @{ Name = 'codex'; Command = 'codex.exe' }
)

foreach ($check in $checks) {
  $cmd = Get-Command $check.Command -ErrorAction SilentlyContinue
  if ($cmd) {
    Write-Host ('[OK]   ' + $check.Name + ' -> ' + $cmd.Source) -ForegroundColor Green
  } else {
    Write-Host ('[MISS] ' + $check.Name) -ForegroundColor Yellow
  }
}

Write-Host ''
if (Test-Path $configPath) {
  Write-Host ('[OK]   config -> ' + $configPath) -ForegroundColor Green
  $config = Get-Content $configPath -Raw
  $masked = $config -replace '(?im)^(CTI_QQ_APP_SECRET=).+$', '$1*****'
  Write-Host $masked
} else {
  Write-Host ('[MISS] config -> ' + $configPath) -ForegroundColor Yellow
}

Write-Host ''
$daemon = Join-Path $skillDir 'dist\daemon.mjs'
if (Test-Path $daemon) {
  Write-Host ('[OK]   daemon -> ' + $daemon) -ForegroundColor Green
} else {
  Write-Host ('[MISS] daemon -> ' + $daemon) -ForegroundColor Yellow
}

if (Test-Path $statusPath) {
  Write-Host ''
  Write-Host '[INFO] status.json' -ForegroundColor Cyan
  Get-Content $statusPath -Raw
}

if (Test-Path $logPath) {
  Write-Host ''
  Write-Host ('[INFO] last ' + $LogLines + ' log lines') -ForegroundColor Cyan
  Get-Content $logPath -Tail $LogLines | ForEach-Object {
    $_ -replace '(?i)(token|secret|password)\s*[:=]\s*\S+', '$1=*****'
  }
} else {
  Write-Host ''
  Write-Host ('[INFO] no log file -> ' + $logPath) -ForegroundColor Yellow
}