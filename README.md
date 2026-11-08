# A3X AI — sua IA privada (MVP)

Projeto independente, feito em **Next.js App Router + TypeScript + PostgreSQL + OpenAI Responses API**. Layout adaptável, login, histórico por usuário, respostas em streaming e instalação no Railway.

## O que já existe

- Login com senha protegida por `scrypt` e sessão aleatória armazenada como hash no banco.
- Configuração da **primeira conta** em `/setup` com `BOOTSTRAP_SECRET` (mínimo 24 caracteres), desativada assim que a conta existe.
- Conversas privadas por usuário, criar, excluir e consultar histórico (100 conversas mais recentes, 200 mensagens de cada).
- Streaming de respostas da IA, limitação de 4.000 caracteres por pergunta e 1.600 tokens de resposta, limite diário configurável (50 por padrão).
- Rate limit básico de tentativas de login/setup por IP. Verificação de origem para operações de escrita.
- PostgreSQL persistente com migrações idempotentes. `healthcheck` do Railway.
- Responsivo no computador e no celular, tema escuro e interface tipo chat.

## Requisitos

- Node.js 22+ e npm
- PostgreSQL local ou Railway
- Chave da API da OpenAI (é separada da assinatura ChatGPT)

## Como usar no VS Code

1. Extraia o ZIP, abra a pasta `a3x-ai` no VS Code.
2. No terminal, execute `npm install`.
3. Copie `.env.example` para `.env.local` e edite `DATABASE_URL`, `OPENAI_API_KEY`, `BOOTSTRAP_SECRET` e (opcional) `AI_MODEL`.
4. Com o PostgreSQL acessível, execute `npm run db:migrate`. O script lê automaticamente `.env.local` no Node.js 22 (recomendado).
5. Execute `npm run dev` e abra `http://localhost:3000`.
6. Na primeira abertura, crie a conta via `/setup` com o `BOOTSTRAP_SECRET`. Depois faça login normalmente.

**Atenção:** gere uma chave de configuração real (ex.: com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Nunca use a chave de exemplo em produção.

## GitHub e Codex

O código-fonte pertence ao repositório [luisgussamazon/baixardado](https://github.com/luisgussamazon/baixardado), autorizado para substituir o projeto FANS.
A versão anterior foi preservada na branch `backup-fans-before-a3x-ai`.
Para trabalhar no VS Code com Codex, leia `docs/GITHUB-CODEX.md` e `AGENTS.md`.

## Implantação no Railway

1. Conecte o Railway ao repositório **luisgussamazon/baixardado** já destinado ao A3X AI. Não use os repositórios SSD VBJ2 ou ICQA TOOL.
2. No Railway, crie um projeto, adicione **PostgreSQL** e um serviço **Deploy from GitHub repo** apontando para este repositório.
3. Na aba **Variables** do serviço Next.js, crie:
   - `DATABASE_URL` como **Reference Variable** de `Postgres.DATABASE_URL` (substitua `Postgres` pelo nome do serviço de banco, se diferente).
   - `OPENAI_API_KEY` sua chave do provedor, mantida só no backend.
   - `BOOTSTRAP_SECRET` um valor forte e exclusivo, no mínimo 24 caracteres.
   - `AI_MODEL` ex.: `gpt-5.4-mini` (verifique disponibilidade em sua conta de API).
   - `DAILY_MESSAGE_LIMIT` ex.: `50`.
   - `NEXT_PUBLIC_APP_NAME` ex.: `A3X AI`.
4. O `railway.json` configura `npm run db:migrate` antes de cada implantação e `npm run start` na inicialização. O script `postbuild` copia os arquivos estáticos para o servidor standalone. Faça o deploy.
5. Em **Settings → Networking**, gere um domínio HTTPS. Abra `/setup`, forneça `BOOTSTRAP_SECRET` e crie sua conta.
6. Depois da criação da conta inicial, você pode **remover `BOOTSTRAP_SECRET`** das variáveis e redeployar; o cadastro inicial continuará bloqueado pela existência da conta.
7. Confira o login, o envio de mensagens, o histórico, a exclusão e o logout. Habilite backups do PostgreSQL, monitore consumo e configure o domínio definitivo.

Links: https://railway.com/guides/nextjs ; https://developers.openai.com/api/docs/guides/streaming-responses

## Limitações conhecidas / próximos passos

- Primeira versão para **um usuário criado pela página inicial**. A estrutura já permite mais usuários, mas não inclui convites ou painel administrativo de contas.
- Não possui upload de arquivos, pesquisa web, RAG, voz, cobrança por assinatura ou gestão de equipe. São módulos futuros, não funcionalidades já implementadas.
- Limite de mensagens diário é por usuário, **não um teto financeiro garantido**. Configure limites de orçamento e alertas no provedor da API e no Railway.
- O uso de modelos pela API pode gerar cobrança mesmo quando a resposta é interrompida. Revise retenção, termos e privacidade antes de abrir acesso ao público.
- O endpoint `/api/health` confirma que o processo está de pé, não verifica banco nem provedor externo.
- Ainda é um MVP. Antes de oferta comercial ou usuários públicos, adicione testes de integração, auditoria, observabilidade, recuperação de conta, proteção antiabuso, políticas e backups verificados.
- Não foi possível rodar `npm install`, `npm run build` ou integração real com banco/API neste ambiente de criação sem acesso ao registro npm. Valide após instalar dependências.

## Comandos úteis

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Proteção de dados

O `.gitignore` protege `.env` e `.env.local`. Não publique segredos em código ou prints. O backend armazena mensagens em PostgreSQL, que devem ser tratadas como dados privados. O uso de `store: false` na Responses API não elimina necessariamente todo tratamento ou retenção de segurança do provedor; consulte as políticas do serviço.

**Aviso:** o repositório `baixardado` está público no GitHub. Não adicione segredos ao código; considere tornar o repositório privado nas configurações do GitHub.
