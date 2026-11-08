# A3X AI — GitHub, Codex e Railway

Repositório oficial deste projeto: https://github.com/luisgussamazon/baixardado

O projeto FANS que ocupava este repositório foi preservado na branch
`backup-fans-before-a3x-ai`. NÃO altere outros repositórios.

## Abrir no VS Code
1. Instale Git para Windows, se ainda não instalado.
2. Abra o terminal PowerShell e execute:

```powershell
cd C:\projetos
git clone https://github.com/luisgussamazon/baixardado.git a3x-ai
code a3x-ai
```

Se a pasta já existir, escolha outra pasta vazia (ou abra a pasta clonada).
Ao fazer modificações no VS Code, use Source Control para commit/push.

## Trabalhar com Codex
Instale a extensão oficial Codex da OpenAI no VS Code e autentique a conta.
A extensão lê o código neste workspace; instrua-a a ler `AGENTS.md` e `README.md`.

Prompt inicial:
> Leia AGENTS.md e README.md. Faça auditoria da arquitetura do A3X AI,
> instalações, segurança, autenticação, PostgreSQL e Railway. Corrija problemas
> verificáveis com mudanças pequenas e seguras. Execute testes disponíveis,
> não publique dados fictícios nem segredos e não altere outros repositórios.
> Trabalhe em branch e abra PR antes de qualquer alteração em produção.

## Railway
Conecte o serviço Next.js ao repositório `luisgussamazon/baixardado`.
Adicione PostgreSQL e configure `DATABASE_URL`, `OPENAI_API_KEY`,
`BOOTSTRAP_SECRET`, `AI_MODEL`, `DAILY_MESSAGE_LIMIT`, `NEXT_PUBLIC_APP_NAME`.
Leia o README para detalhes. As credenciais nunca devem estar no Git.

Este repositório está PUBLICAMENTE visível no momento desta preparação.


## Substituir o FANS pelo A3X AI a partir do ZIP
Se estiver usando o pacote completo preparado nesta conversa, extraia o ZIP e,
na raiz `a3x-ai`, execute no terminal PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publicar-em-baixardado.ps1
```

O script exige o backup remoto `backup-fans-before-a3x-ai`,
cria um clone NOVO em `C:\projetos\A3X-AI-GitHub`, troca somente os arquivos
desse clone, registra um commit e faz push para `main`. Nunca sobrescreve sua
pasta local de outro sistema, nem envia `.env.local`. Não usa Node.js local.
Se a pasta de destino já existir, o script interrompe sem apagá-la.
