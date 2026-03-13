$ErrorActionPreference = "Stop"

$commands = @(
  @{
    Name = "node"
    Command = "node.exe"
  },
  @{
    Name = "npm"
    Command = "npm.cmd"
  },
  @{
    Name = "git"
    Command = "git.exe"
  },
  @{
    Name = "codex"
    Command = "codex.exe"
  }
)

$results = foreach ($item in $commands) {
  $cmd = Get-Command $item.Command -ErrorAction SilentlyContinue
  [PSCustomObject]@{
    Name = $item.Name
    Found = [bool]$cmd
    Source = if ($cmd) { $cmd.Source } else { "" }
  }
}

$results | Format-Table -AutoSize

$missing = $results | Where-Object { -not $_.Found }
if ($missing) {
  Write-Host ""
  Write-Host "Missing commands:" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host " - $($_.Name)" -ForegroundColor Yellow }
  exit 1
}

Write-Host ""
Write-Host "Tip: use npm.cmd on Windows PowerShell to avoid execution policy issues." -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment looks ready for the bridge bootstrap." -ForegroundColor Green