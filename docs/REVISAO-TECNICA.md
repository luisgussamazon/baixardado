# Revisão técnica — A3X AI

Revisão local em 08/11/2026, branch `fix/production-readiness`. Nenhum commit, push, migração de produção ou deploy foi executado.

## Problemas corrigidos

| Área / arquivos | Causa e correção |
| --- | --- |
| `app/api/chat/route.ts` | Cota e pergunta eram gravadas separadamente; agora compartilham transação. Liberação do bloqueio verifica o identificador temporal exato da operação, preservando precisão do PostgreSQL. |
| Streaming OpenAI | Cancelamento do consumidor não abortava explicitamente a geração; agora aborta o transporte e libera o bloqueio. Há limite total de 120 segundos e nenhuma repetição automática de geração. Respostas incompletas, falhas e recusas têm tratamento explícito. Somente resposta concluída é persistida. |
| `components/chat-app.tsx` | Erros podiam deixar respostas vazias ou perguntas locais sem confirmação no banco. A interface consulta o histórico após falha, restaura o texto para edição e impede envio simultâneo ou durante carregamento. Fechar erro não recria a seleção por temporizador. |
| Rotas de login, setup, logout e conversas | Falhas de sessão/conexão agora retornam JSON genérico. Senhas de contas inexistentes também executam scrypt; formato de hash é validado. Exclusão respeita conversa ocupada e leitura de histórico inexistente retorna 404. |
| `lib/http.ts`, `lib/security.ts` | Corpo era lido integralmente antes do limite. Agora leitura é limitada a 32 KiB e valida UTF-8/objeto JSON; content-type é exato. Origem deve ser HTTP(S), com HTTPS obrigatório em produção. |
| `lib/db.ts`, `scripts/migrate.mjs` | Tratamento de erro em conexão ociosa evita encerramento do processo; conexão, consultas e transações ociosas possuem limites. Logs não imprimem exceções que possam conter conteúdo privado. Migrações mantêm transações, rastreamento e advisory lock existentes. |
| `app/api/health/route.ts`, `scripts/start.mjs` | Healthcheck deixou de aceitar processo sem banco/esquema acessível. Inicialização fixa host de escuta compatível com Railway e usa PORT fornecida pelo ambiente. |
| `package.json`, `package-lock.json`, `.github/workflows/ci.yml` | Dependências agora têm lockfile; PostCSS corrigido por override compatível com Next 15. Testes e CI adicionados sem etapa de publicação. |
| `next-env.d.ts`, `scripts/publicar-em-baixardado.ps1` | Referências de tipos regeneradas pelo build. O script legado de cópia agora inclui lockfile, testes e CI; ele não foi executado. |
| `app/error.tsx`, `components/auth-form.tsx`, `next.config.ts` | Feedback genérico para indisponibilidade, fallback para resposta não JSON e headers de proteção. Layout responsivo existente preservado. |

O tratamento dos eventos segue a [referência oficial de streaming da OpenAI](https://developers.openai.com/api/reference/resources/responses/streaming-events). `store: false`, chave exclusivamente no servidor, autorização por usuário e consultas parametrizadas foram preservados. Nenhuma mudança de esquema foi necessária.

## Verificação local

- `npm test`: 11 testes aprovados, cobrindo senha, entrada, origem, limites de corpo, sessão, logout, autorização do histórico, streaming completo/incompleto, cancelamento e prontidão.
- Teste PostgreSQL com PGlite: esquema inicial idempotente, isolamento por proprietário, cota, rollback, bloqueio temporal e exclusão em cascata. A extensão pgcrypto é omitida somente no teste; o banco descartável já fornece gen_random_uuid.
- `npm run typecheck` e `npm run build`: aprovados, incluindo preparação dos assets standalone.
- `npm audit`: zero vulnerabilidades após atualização do PostCSS na instalação revisada.
- `git diff --check`: aprovado.
- Smoke HTTP local do standalone: porta customizada e host de escuta funcionais; `/api/health` retorna 503 sem configuração, `/api/conversations` retorna 401 sem sessão, `/logo.svg` retorna 200 e headers de proteção estão presentes. Processo local encerrado após o teste.

Os testes de rotas simulam acesso ao pool e transporte HTTP da OpenAI; não substituem teste ponta a ponta com PostgreSQL de rede. O CI foi preparado, mas não foi executado no GitHub. Não houve validação visual em navegador nem chamada à OpenAI real.

## Antes de autorizar a implantação

1. Revisar esta branch e as alterações locais. Publicação depende de autorização do responsável.
2. Configurar PostgreSQL e variáveis privadas no Railway conforme README. Confirmar disponibilidade de `AI_MODEL` na conta de API.
3. Na implantação autorizada, executar o predeploy `npm run db:migrate`; a revisão não executou esse script contra banco externo.
4. Conferir `/api/health`, setup único, login HTTPS, mensagens em streaming, histórico, exclusão e logout no domínio final.
5. Habilitar backup do PostgreSQL e testar restauração; configurar limites e alertas de gastos na OpenAI/Railway.

## Limitações operacionais

- O IP de rate limit depende da cadeia de proxies confiáveis. Confirmar no Railway que `x-forwarded-for` não permite contornar o limite; para exposição pública, adicionar proteção de borda e limite por conta. Não foi testado neste ambiente.
- Sessões expiradas e chaves antigas de tentativas continuam armazenadas; planejar rotina de manutenção com retenção definida, sem apagar histórico automaticamente.
- Não há recuperação de conta, administração de usuários ou observabilidade completa. O healthcheck não valida credenciais OpenAI nem permissões/colunas de cada tabela.
- A interface mantém limites de 100 conversas e 200 mensagens visíveis; o contexto enviado ao modelo usa as últimas 24 mensagens.
- Upload, pesquisa web, voz e cobrança permanecem fora do produto.
