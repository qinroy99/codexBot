param(
  [Parameter(Position=0)]
  [ValidateSet('start')]
  [string]$Command = 'start'
)

$scriptRoot = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptRoot
$uiRoot = Join-Path $projectRoot 'ui-console'

switch ($Command) {
  'start' {
    Set-Location $uiRoot
    node server.mjs
  }
}
