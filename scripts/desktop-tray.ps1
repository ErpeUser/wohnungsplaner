param([Parameter(Mandatory=$true)][string]$RepositoryRoot, [Parameter(Mandatory=$true)][string]$NodePath)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'desktop-process.ps1')
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Net.Http
[System.Windows.Forms.Application]::EnableVisualStyles()
$localFolder = Join-Path $RepositoryRoot '.local'
New-Item -ItemType Directory -Path $localFolder -Force | Out-Null
$openSignal = Join-Path $localFolder 'desktop-open.signal'
$stopSignal = Join-Path $localFolder 'desktop-stop.signal'
$mutex = New-Object System.Threading.Mutex($false, 'Local\WohnungsplanerDesktopTray')
if (-not $mutex.WaitOne(0, $false)) {
    [IO.File]::WriteAllText($openSignal, 'open'); $mutex.Dispose(); return
}
$script:worker = $null
$script:openWhenReady = $true
$script:quitting = $false
$script:lastUpdate = [DateTime]::Now
$script:healthTask = $null
$script:healthClient = New-Object System.Net.Http.HttpClient
$script:healthClient.Timeout = [TimeSpan]::FromSeconds(3)
$script:lastHealth = [DateTime]::MinValue
$icons = @{}
$iconFolder = Join-Path $env:LOCALAPPDATA 'Wohnungsplaner'
foreach ($name in @('loading','ready','error')) { $icons[$name] = New-Object System.Drawing.Icon (Join-Path $iconFolder "$name.ico") }
$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = $icons.loading; $tray.Text = 'Wohnungsplaner - lädt'; $tray.Visible = $true
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$statusItem = $menu.Items.Add('Wird gestartet …'); $statusItem.Enabled = $false
$warningItem = $menu.Items.Add(''); $warningItem.Enabled = $false; $warningItem.Visible = $false
$null = $menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
$openItem = $menu.Items.Add('Wohnungsplaner öffnen')
$updateItem = $menu.Items.Add('Jetzt aktualisieren')
$folderItem = $menu.Items.Add('Projektordner öffnen')
$exitItem = $menu.Items.Add('Wohnungsplaner beenden')
$tray.ContextMenuStrip = $menu
function Open-Planner {
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = 'http://127.0.0.1:3001/'
    $start.UseShellExecute = $true
    [System.Diagnostics.Process]::Start($start) | Out-Null
}
function Start-PlannerWorker([string]$Action) {
    if ($script:worker -and -not $script:worker.HasExited) { return }
    $tray.Icon = $icons.loading; $tray.Text = 'Wohnungsplaner - lädt'
    $script:worker = Start-PlannerBackgroundProcess -FilePath $NodePath -Arguments @(('"' + (Join-Path $RepositoryRoot 'scripts\desktop-runtime.mjs') + '"'), $Action) -WorkingDirectory $RepositoryRoot -OutputLog (Join-Path $localFolder 'desktop-worker.log') -ErrorLog (Join-Path $localFolder 'desktop-worker-error.log')
    $script:lastUpdate = [DateTime]::Now
}
$openItem.Add_Click({ if ($script:phase -eq 'ready') { Open-Planner } else { $script:openWhenReady = $true; Start-PlannerWorker 'start' } })
$tray.Add_DoubleClick({ $openItem.PerformClick() })
$updateItem.Add_Click({ Start-PlannerWorker 'update' })
$folderItem.Add_Click({ Start-Process -FilePath explorer.exe -ArgumentList ('"' + $RepositoryRoot + '"') -WindowStyle Hidden })
$exitItem.Add_Click({ $script:quitting = $true; $script:openWhenReady = $false; $openItem.Enabled = $false; $updateItem.Enabled = $false; $exitItem.Enabled = $false })
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 600
$timer.Add_Tick({
    try {
        if (Test-Path -LiteralPath $stopSignal) { Remove-Item -LiteralPath $stopSignal; $exitItem.PerformClick() }
        if ($script:quitting) {
            if ($script:worker -and -not $script:worker.HasExited) { return }
            if ($script:stopStarted) {
                $state = Get-Content -LiteralPath (Join-Path $localFolder 'desktop-state.json') -Raw | ConvertFrom-Json
                if ($script:worker.ExitCode -ne 0 -or $state.phase -ne 'stopped') { throw ('Beenden fehlgeschlagen: ' + $state.message) }
                [System.Windows.Forms.Application]::Exit(); return
            }
            $script:stopStarted = $true; Start-PlannerWorker 'stop'; return
        }
        if (Test-Path -LiteralPath $openSignal) { Remove-Item -LiteralPath $openSignal; $openItem.PerformClick() }
        $workerRunning = $script:worker -and -not $script:worker.HasExited
        if (Test-Path -LiteralPath (Join-Path $localFolder 'desktop-state.json')) {
            $state = Get-Content -LiteralPath (Join-Path $localFolder 'desktop-state.json') -Raw | ConvertFrom-Json
            $script:phase = $state.phase
            if ($workerRunning) { $script:phase = 'loading' }
            elseif ($script:worker -and $script:worker.ExitCode -ne 0) { $script:phase = 'error' }
            $statusItem.Text = $state.message
            $warningItem.Visible = [bool]$state.warning; $warningItem.Text = [string]$state.warning
            if (-not $workerRunning -and $state.phase -eq 'ready') {
                if ($script:healthTask -and $script:healthTask.IsCompleted) {
                    try { $response = $script:healthTask.GetAwaiter().GetResult(); $script:healthFailed = -not $response.IsSuccessStatusCode; $response.Dispose() } catch { $script:healthFailed = $true }
                    $script:healthTask = $null
                }
                if (-not $script:healthTask -and ([DateTime]::Now - $script:lastHealth).TotalSeconds -ge 5) {
                    $script:healthTask = $script:healthClient.GetAsync('http://127.0.0.1:3001/')
                    $script:lastHealth = [DateTime]::Now
                }
                if ($script:healthFailed) { $script:phase = 'error'; $statusItem.Text = 'Vorschau nicht erreichbar - zum Neustart doppelklicken' }
            } else { $script:healthFailed = $false }
            $iconName = if ($script:phase -eq 'ready') { 'ready' } elseif ($script:phase -eq 'error') { 'error' } else { 'loading' }
            $tray.Icon = $icons[$iconName]
            $tray.Text = ('Wohnungsplaner - ' + $statusItem.Text).Substring(0, [Math]::Min(63, ('Wohnungsplaner - ' + $statusItem.Text).Length))
            if ($script:phase -eq 'ready' -and -not $workerRunning -and $script:openWhenReady) { $script:openWhenReady = $false; Open-Planner }
        }
        $updateItem.Enabled = -not $workerRunning
        if (-not $workerRunning -and ([DateTime]::Now - $script:lastUpdate).TotalMinutes -ge 5) { Start-PlannerWorker 'update' }
    } catch {
        $tray.Icon = $icons.error; $tray.Text = 'Wohnungsplaner - Fehler'
        $statusItem.Text = $_.Exception.Message
        $script:quitting = $false; $script:stopStarted = $false; $exitItem.Enabled = $true; $openItem.Enabled = $true
    }
})
try {
    Start-PlannerWorker 'start'; $timer.Start()
    [System.Windows.Forms.Application]::Run()
} finally {
    $timer.Stop(); $timer.Dispose(); $tray.Visible = $false; $tray.Dispose(); $menu.Dispose()
    foreach ($icon in $icons.Values) { $icon.Dispose() }
    $script:healthClient.Dispose(); $mutex.ReleaseMutex(); $mutex.Dispose()
}
