$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ((Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).name -ne 'wohnungsplaner') { throw 'Falscher Projektordner' }
$homeFolder = Join-Path $env:LOCALAPPDATA 'Wohnungsplaner'
New-Item -ItemType Directory -Path $homeFolder -Force | Out-Null
. (Join-Path $PSScriptRoot 'desktop-icons.ps1')
New-PlannerIcon '#E5A329' (Join-Path $homeFolder 'loading.ico')
New-PlannerIcon '#249B73' (Join-Path $homeFolder 'ready.ico')
New-PlannerIcon '#D24E4E' (Join-Path $homeFolder 'error.ico')
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
@{ repositoryRoot = $root; nodePath = $nodePath } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $homeFolder 'config.json') -Encoding UTF8
@'
$ErrorActionPreference = 'Stop'
try {
    $config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
    & (Join-Path $config.repositoryRoot 'scripts\desktop-tray.ps1') -RepositoryRoot $config.repositoryRoot -NodePath $config.nodePath
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Wohnungsplaner') | Out-Null
}
'@ | Set-Content -LiteralPath (Join-Path $homeFolder 'launch.ps1') -Encoding UTF8
$shell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Wohnungsplaner.lnk'
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = '-NoLogo -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + (Join-Path $homeFolder 'launch.ps1') + '"'
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = (Join-Path $homeFolder 'ready.ico') + ',0'
$shortcut.Description = 'Wohnungsplaner öffnen, automatisch aktualisieren und über das Tray beenden'
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output "Desktop-Verknüpfung erstellt: $shortcutPath"
