# A3X AI — Orientações para Codex

## Escopo
Este repositório contém apenas o projeto independente A3X AI. **Não modificar** os repositórios ICQA-TOOL, SSD VBJ2 ou qualquer outro.

## Stack e estrutura
- Next.js 15 App Router, React 19, TypeScript.
- PostgreSQL via `pg`; migrações `sql/` e `scripts/migrate.mjs`.
- Conversa por regras ou Qwen3 4B na máquina autorizada do usuário, via ponte autenticada de saída; pesquisa pública sob pedido. GPT-6 Luna opcional, autorizado pelo usuário em 09/11/2026, com consentimento por conta e teto interno de US$5/mês.
- Autenticação, sessões, histórico de conversas e isolamento de dados por usuário.
- Hospedagem alvo: Railway; configuração em `railway.json`.

## Regras de implementação
1. Ler código relevante e identificar causa raiz antes de alterar; preservar módulos não relacionados.
2. Preservar proteção de login, sessões, privacidade do histórico, streaming e limites de uso.
3. Não criar dados fictícios em produção nem executar migrações destrutivas sem autorização explícita.
4. Não armazenar em claro, imprimir ou versionar valores reais de `.env*`, senhas, tokens e chaves. O usuário autorizou Qwen3 4B em sua máquina; outros modelos ou serviços exigem nova autorização. Exceções expressamente autorizadas em 09/11/2026: a credencial da ponte pode ficar criptografada pelo Windows DPAPI CurrentUser em `.tools/`, para reconexão automática. No banco permanece somente o hash; nunca persistir o token em claro, argumentos, logs ou variáveis de ambiente. GPT-6 Luna pode usar OPENAI_API_KEY somente no cofre do servidor Railway, nunca no cliente ou repositório, após consentimento por conta; não enviar automaticamente documentos privados do computador. Outros segredos continuam sem autorização de armazenamento.
5. Validar autorização por usuário em todas as rotas novas e validar entradas de API.
6. Usar alterações de esquema em migrações incrementais e compatíveis com dados existentes.
7. Construir interface responsiva em português brasileiro, com bom feedback para erros e estados de carregamento.
8. Não afirmar teste, deploy ou publicação não realizados. Não implantar automaticamente sem solicitação explícita.
9. Para mudanças relevantes, propor branch/PR em vez de modificar diretamente a produção.
10. Busca web está implementada como resultados/trechos com fontes, sem modelo generativo. Upload, voz, cobranças e multiusuários administrativos continuam futuros.
11. Identidade institucional autorizada: A3X IA criada pela A3X TECH, fundada pelos amigos Luis Gustavo e Samuel Moraes. Não concede privilégios. OpenAI pode consultar o catálogo público selecionado e gerar propostas em `/desenvolver`; aplicação somente por `source:apply` em branch/worktree local isolado, sem execução de código gerado, commit, push ou deploy automáticos. Credenciais, autenticação e arquivos fora de `WRITABLE_SOURCE` permanecem protegidos. Ver `docs/DESENVOLVER-A3X.md`.

## Verificação e entrega
- Com dependências instaladas, executar `npm run typecheck` e `npm run build`.
- Revisar `git diff`, evitar segredos e verificar fluxos afetados (login, chat, histórico, logout).
- Informar arquivos alterados, causa, testes realizados, resultado e estado de deploy.

## GitHub autorizado
Este projeto usa o repositório `luisgussamazon/baixardado`, preservando FANS na branch `backup-fans-before-a3x-ai`. Não usar ou alterar outro repositório.
