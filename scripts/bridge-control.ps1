param(
  [Parameter(Position=0)]
  [ValidateSet('start','stop','status','logs','doctor')]
  [string]$Command = 'status',

  [Parameter(Position=1)]
  [int]$LogLines = 80
)

$scriptRoot = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptRoot
$localSkillRoot = Join-Path $projectRoot 'vendor\Claude-to-IM-skill'
$installedSkillRoot = Join-Path $env:USERPROFILE '.codex\skills\claude-to-im'
$skillRoot = if (Test-Path $localSkillRoot) { $localSkillRoot } else { $installedSkillRoot }

if (-not (Test-Path $skillRoot)) {
  throw "Skill root not found: $skillRoot"
}

switch ($Command) {
  'doctor' {
    powershell -ExecutionPolicy Bypass -File (Join-Path $skillRoot 'scripts\doctor.ps1') $LogLines
  }
  'logs' {
    powershell -ExecutionPolicy Bypass -File (Join-Path $skillRoot 'scripts\daemon.ps1') logs $LogLines
  }
  default {
    powershell -ExecutionPolicy Bypass -File (Join-Path $skillRoot 'scripts\daemon.ps1') $Command
  }
}
