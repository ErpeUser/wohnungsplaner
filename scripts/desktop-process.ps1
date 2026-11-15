function Start-PlannerBackgroundProcess([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [string]$OutputLog, [string]$ErrorLog) {
    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $OutputLog -RedirectStandardError $ErrorLog
    # Windows PowerShell 5 otherwise loses ExitCode when the child exits.
    $null = $process.Handle
    return $process
}
