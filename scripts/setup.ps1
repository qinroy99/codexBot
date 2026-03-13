param(
  [string]$UpstreamRepo = "https://github.com/op7418/Claude-to-IM-skill.git",
  [string]$VendorDir = ""
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptRoot
if (-not $VendorDir) {
  $VendorDir = Join-Path $projectRoot 'vendor\Claude-to-IM-skill'
}

$required = @(
  @{ Name = "git"; Command = "git.exe" },
  @{ Name = "node"; Command = "node.exe" },
  @{ Name = "npm"; Command = "npm.cmd" }
)
foreach ($item in $required) {
  if (-not (Get-Command $item.Command -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $($item.Name)"
  }
}

if (-not (Test-Path $VendorDir)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $VendorDir) | Out-Null
  git clone $UpstreamRepo $VendorDir
}

Write-Host "Upstream project is available at $VendorDir" -ForegroundColor Green
Write-Host "Next step: install dependencies according to the upstream project README." -ForegroundColor Cyan
