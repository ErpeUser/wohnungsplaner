$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$generatedDirectory = Join-Path (Split-Path -Parent $projectDirectory) "Wohnungsplaner_Generated"
# Force all npm downloads, logs and ephemeral subprocess files into the local project workspace.
$env:npm_config_cache = Join-Path $generatedDirectory "cache\npm"
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $generatedDirectory "downloads\playwright"
$env:TEMP = Join-Path $generatedDirectory "tmp"
$env:TMP = $env:TEMP
$plannerUrl = "http://127.0.0.1:3000/"
$port = 3000
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
  $serverBuild = Join-Path $generatedDirectory "build\dist\server\index.js"
  if (-not (Test-Path -LiteralPath $serverEntryPoint)) {
    throw "Der Server-Einstiegspunkt fehlt: $serverEntryPoint"
  }
  $vinextCli = Join-Path $generatedDirectory "dependencies\node_modules\vinext\dist\cli.js"
  if (-not (Test-Path -LiteralPath $serverBuild) -or -not (Test-Path -LiteralPath $vinextCli)) {
    # Reconstruct disposable dependencies and build output on the first start.
    $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
    $workspaceSetup = Join-Path $projectDirectory "scripts\workspace-setup.mjs"
    & $nodePath $workspaceSetup ensure
    if ($LASTEXITCODE -ne 0) { throw "Arbeitsdaten oder Abhaengigkeiten konnten nicht vorbereitet werden." }
    Push-Location $projectDirectory
    try {
      & $npmPath run build
      if ($LASTEXITCODE -ne 0) { throw "Automatischer Wohnungsplaner-Build fehlgeschlagen." }
    } finally { Pop-Location }
    if (-not (Test-Path -LiteralPath $serverBuild)) {
      throw "Der Build wurde nicht erzeugt: $serverBuild"
    }
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
