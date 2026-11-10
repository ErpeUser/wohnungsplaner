$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$plannerUrl = "http://127.0.0.1:5173/"
$port = 5173
$nodeCandidates = @(
  (Join-Path ${env:ProgramFiles} "nodejs\node.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe")
)
$nodePath = $nodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $nodePath) {
  try { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source } catch { $nodePath = $null }
}

function Test-PlannerReady {
  try {
    $response = Invoke-WebRequest -Uri $plannerUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-PlannerReady)) {
  if (-not $nodePath) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
      "Node.js wurde nicht gefunden. Bitte Node.js installieren und die Verknüpfung erneut starten.",
      "Wohnungsplaner",
      "OK",
      "Error"
    ) | Out-Null
    exit 1
  }

  $serverEntryPoint = Join-Path $projectDirectory "serve-local.mjs"
  $serverBuild = Join-Path $projectDirectory "dist\server\index.js"
  if (-not (Test-Path -LiteralPath $serverEntryPoint) -or -not (Test-Path -LiteralPath $serverBuild)) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
      "Der lokale Build fehlt. Bitte den Wohnungsplaner einmal neu bauen.",
      "Wohnungsplaner",
      "OK",
      "Error"
    ) | Out-Null
    exit 1
  }

  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = $nodePath
  $processInfo.Arguments = "`"$serverEntryPoint`""
  $processInfo.WorkingDirectory = $projectDirectory
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true
  $env:PORT = [string]$port
  [void][System.Diagnostics.Process]::Start($processInfo)

  $deadline = (Get-Date).AddSeconds(45)
  do {
    Start-Sleep -Milliseconds 500
    if (Test-PlannerReady) { break }
  } while ((Get-Date) -lt $deadline)
}

if (Test-PlannerReady) {
  Start-Process $plannerUrl
} else {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(
    "Der Wohnungsplaner konnte nicht gestartet werden. Bitte pruefen, ob Node.js installiert ist.",
    "Wohnungsplaner",
    "OK",
    "Error"
  ) | Out-Null
  exit 1
}
