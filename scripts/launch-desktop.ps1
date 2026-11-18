$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
try {
  $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
  $setup = Join-Path $PSScriptRoot 'workspace-setup.mjs'
  & $nodePath $setup prepare
  if ($LASTEXITCODE -ne 0) { throw 'Arbeitsdaten konnten nicht vorbereitet werden.' }
  $iconFolder = Join-Path (Split-Path -Parent $root) 'Wohnungsplaner_Generated\desktop'
  New-Item -ItemType Directory -Path $iconFolder -Force | Out-Null
  . (Join-Path $PSScriptRoot 'desktop-icons.ps1')
  if (-not (Test-Path -LiteralPath (Join-Path $iconFolder 'loading.ico'))) {
    New-PlannerIcon '#E5A329' (Join-Path $iconFolder 'loading.ico')
  }
  if (-not (Test-Path -LiteralPath (Join-Path $iconFolder 'ready.ico'))) {
    New-PlannerIcon '#249B73' (Join-Path $iconFolder 'ready.ico')
  }
  if (-not (Test-Path -LiteralPath (Join-Path $iconFolder 'error.ico'))) {
    New-PlannerIcon '#D24E4E' (Join-Path $iconFolder 'error.ico')
  }
  & (Join-Path $PSScriptRoot 'desktop-tray.ps1') -RepositoryRoot $root -NodePath $nodePath
} catch {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Wohnungsplaner') | Out-Null
  exit 1
}
