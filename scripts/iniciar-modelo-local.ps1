param([switch]$Quiet)
$ErrorActionPreference='Stop'
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$ollamaExe=Join-Path $projectRoot '.tools\ollama\ollama.exe'
$nodeExe=Join-Path $projectRoot '.tools\node-v22.23.4-win-x64\node.exe'
if(!(Test-Path -LiteralPath $ollamaExe)){throw 'Ollama portátil não encontrado. Instale os componentes oficiais antes de iniciar.'}
if(!(Test-Path -LiteralPath $nodeExe)){$nodeExe=(Get-Command node -ErrorAction Stop).Source}
$worker=Join-Path $projectRoot 'scripts\model-worker.ts'
$alreadyRunning=Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($worker)}
if($alreadyRunning){if(!$Quiet){Write-Output 'A ponte já está em execução. A reconexão usa a credencial protegida quando disponível.'};return}
$env:OLLAMA_HOST='127.0.0.1:11434'
$env:OLLAMA_MODELS=Join-Path $projectRoot '.tools\ollama\models'
$env:OLLAMA_NO_CLOUD='1'
$env:OLLAMA_NUM_PARALLEL='1'
$env:OLLAMA_MAX_LOADED_MODELS='1'
$env:OLLAMA_CONTEXT_LENGTH='4096'
try{Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 | Out-Null}catch{
  Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WorkingDirectory (Split-Path $ollamaExe) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.tools\ollama-server.log') -RedirectStandardError (Join-Path $projectRoot '.tools\ollama-server-error.log')
  Start-Sleep -Seconds 3
}
$models=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
if(!($models.models | Where-Object {$_.name -eq 'qwen3:4b-instruct'})){throw 'Modelo ausente. Execute ollama pull qwen3:4b-instruct antes de conectar.'}
$loader=Join-Path $projectRoot 'node_modules\tsx\dist\cli.mjs'
if(!(Test-Path -LiteralPath $loader)){throw 'Dependências ausentes: execute npm ci na pasta do projeto.'}
Start-Process -FilePath $nodeExe -ArgumentList @(('"'+$loader+'"'),('"'+$worker+'"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.tools\model-worker.log') -RedirectStandardError (Join-Path $projectRoot '.tools\model-worker-error.log')
Write-Output 'Ponte iniciada. Ela reconecta automaticamente se já estiver vinculada; na primeira vez, consulte .tools/model-worker.log.'
