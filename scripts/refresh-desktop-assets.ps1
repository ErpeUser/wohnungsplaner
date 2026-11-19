$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$iconFolder = Join-Path (Split-Path -Parent $root) 'Wohnungsplaner_Generated\desktop'
New-Item -ItemType Directory -Path $iconFolder -Force | Out-Null
. (Join-Path $PSScriptRoot 'desktop-icons.ps1')

New-PlannerIcon '#E5A329' (Join-Path $iconFolder 'loading.ico')
New-PlannerIcon '#249B73' (Join-Path $iconFolder 'ready.ico')
New-PlannerIcon '#D24E4E' (Join-Path $iconFolder 'error.ico')

Write-Output ('Desktop-Assets aktualisiert: ' + $iconFolder)
