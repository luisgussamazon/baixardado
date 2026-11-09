$ErrorActionPreference='Stop'
$launcher=Join-Path $PSScriptRoot 'iniciar-modelo-local.ps1'
while($true){
  try { & $launcher -Quiet } catch { Write-Output 'A3X: tentativa de iniciar a ponte falhou; nova tentativa em 30 segundos.' }
  Start-Sleep -Seconds 30
}
