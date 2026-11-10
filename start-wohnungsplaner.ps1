$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$plannerUrl = "http://localhost:5173/"
$port = 5173

function Test-PlannerReady {
  try {
    $response = Invoke-WebRequest -Uri $plannerUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-PlannerReady)) {
  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = "cmd.exe"
  $processInfo.Arguments = "/c npm.cmd run dev -- --host 127.0.0.1"
  $processInfo.WorkingDirectory = $projectDirectory
  $processInfo.UseShellExecute = $true
  $processInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
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
