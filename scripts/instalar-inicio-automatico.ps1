# Instalação explícita no login do usuário atual. Não pede senha nem usa SYSTEM.
$ErrorActionPreference='Stop'
$supervisor=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'manter-modelo-local.ps1'))
if(!(Test-Path -LiteralPath $supervisor)){throw 'Supervisor não encontrado.'}
$command='powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$supervisor+'"'
$key='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
New-ItemProperty -LiteralPath $key -Name 'A3X AI Modelo Local' -Value $command -PropertyType String -Force | Out-Null
Write-Output 'Início automático configurado no login deste usuário Windows. Para remover: exclua apenas A3X AI Modelo Local da chave Run deste usuário.'
