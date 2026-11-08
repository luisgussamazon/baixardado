param(
  [string]$PastaDestino = "C:\projetos\A3X-AI-GitHub"
)

$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/luisgussamazon/baixardado.git'
$Fonte = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git nao foi encontrado. Instale Git for Windows e reinicie o VS Code."
}
if (-not (Test-Path (Join-Path $Fonte 'package.json'))) {
  throw "Abra a pasta a3x-ai extraida do ZIP e rode este script em scripts\publicar-em-baixardado.ps1."
}
if (Test-Path $PastaDestino) {
  throw "A pasta destino ja existe: $PastaDestino. Escolha outra pasta vazia usando -PastaDestino."
}

$Backup = (& git ls-remote --heads $Repo backup-fans-before-a3x-ai)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Backup)) {
  throw "Backup remoto nao localizado. Nao sera feita substituicao sem backup."
}

$Pai = Split-Path -Parent $PastaDestino
New-Item -ItemType Directory -Force -Path $Pai | Out-Null
Write-Host "Clonando somente $Repo para $PastaDestino ..."
& git clone --branch main --single-branch $Repo $PastaDestino
if ($LASTEXITCODE -ne 0) { throw "Falha no clone ou na autenticacao do GitHub." }

Push-Location $PastaDestino
try {
  # Remove apenas arquivos versionados deste clone; nunca toca nos projetos locais originais.
  & git rm -r -q -- .
  if ($LASTEXITCODE -ne 0) { throw "Nao consegui remover o codigo antigo do clone." }

  $Raizes = @('app','components','docs','lib','public','scripts','sql','tests','.github')
  $ArquivosRaiz = @('.env.example','.gitignore','AGENTS.md','README.md',
     'next-env.d.ts','next.config.ts','package.json','package-lock.json','railway.json','tsconfig.json')
  $Copiados = 0

  foreach ($File in Get-ChildItem -LiteralPath $Fonte -File -Recurse -Force) {
    $Relativo = $File.FullName.Substring($Fonte.Length).TrimStart('\','/')
    $Partes = $Relativo -split '[\\/]'
    if ($Relativo -match '(^|[\\/])(\.git|node_modules|\.next)([\\/]|$)') { continue }
    if ($Relativo -match '(^|[\\/])\.env' -and $Relativo -ne '.env.example') { continue }
    if ($Relativo -match '\.(log|tsbuildinfo)$') { continue }
    if ($Partes.Count -eq 1) {
      if ($ArquivosRaiz -notcontains $Relativo) { continue }
    }
    elseif ($Raizes -notcontains $Partes[0]) { continue }

    $DestinoArquivo = Join-Path $PastaDestino $Relativo
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $DestinoArquivo) | Out-Null
    Copy-Item -LiteralPath $File.FullName -Destination $DestinoArquivo -Force
    $Copiados++
  }

  if ($Copiados -lt 30) { throw "Arquivos insuficientes ($Copiados). Publicacao interrompida." }
  & git add -A
  if ($LASTEXITCODE -ne 0) { throw "Falha no git add." }

  $Staged = @(& git diff --cached --name-only)
  $Sigilosos = @($Staged | Where-Object {
    ($_ -match '(^|/)\.env($|\.)' -and $_ -ne '.env.example') -or
    ($_ -match '(^|/)(node_modules|\.next)(/|$)')
  })
  if ($Sigilosos.Count -gt 0) {
    throw "Arquivos sensiveis no staging: $($Sigilosos -join ', '). Interrompido."
  }
  Write-Host "Preparados $Copiados arquivos do A3X AI. Revisando..."
  & git status --short

  if ($Staged.Count -eq 0) {
    Write-Host "O projeto remoto ja possui os mesmos arquivos; nada para enviar."
  } else {
    & git commit -m "feat: substituir FANS pelo projeto A3X AI"
    if ($LASTEXITCODE -ne 0) {
      throw "Falha no commit. Configure user.name e user.email no Git e tente novamente."
    }
    & git push -u origin main
    if ($LASTEXITCODE -ne 0) {
      throw "Falha no push. O commit esta salvo em $PastaDestino. Verifique autenticacao e execute 'git push -u origin main'."
    }
    Write-Host "PUBLICACAO CONCLUIDA: https://github.com/luisgussamazon/baixardado"
  }
  Write-Host "Abra no VS Code a pasta: $PastaDestino"
  Write-Host "Backup do FANS: https://github.com/luisgussamazon/baixardado/tree/backup-fans-before-a3x-ai"
} finally {
  Pop-Location
}
