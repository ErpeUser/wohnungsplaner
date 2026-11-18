@echo off
rem Direkter Programmbetrieb ohne Desktop-Verknuepfung oder NTFS-Links.
set "PROJECT=%~dp0"
cd /d "%PROJECT%"
powershell.exe -NoLogo -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "%PROJECT%scripts\launch-desktop.ps1"
if errorlevel 1 (
  echo Wohnungsplaner konnte nicht gestartet werden. Details unter:
  echo %PROJECT%..\Wohnungsplaner_Generated\logs\local
  pause
)
