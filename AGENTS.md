# A3X AI — Orientações para Codex

## Escopo
Este repositório contém apenas o projeto independente A3X AI. **Não modificar** os repositórios ICQA-TOOL, SSD VBJ2 ou qualquer outro.

## Stack e estrutura
- Next.js 15 App Router, React 19, TypeScript.
- PostgreSQL via `pg`; migrações `sql/` e `scripts/migrate.mjs`.
- Pesquisa pública na web, sem OpenAI e sem download de modelos, nas rotas do servidor em `app/api`.
- Autenticação, sessões, histórico de conversas e isolamento de dados por usuário.
- Hospedagem alvo: Railway; configuração em `railway.json`.

## Regras de implementação
1. Ler código relevante e identificar causa raiz antes de alterar; preservar módulos não relacionados.
2. Preservar proteção de login, sessões, privacidade do histórico, streaming e limites de uso.
3. Não criar dados fictícios em produção nem executar migrações destrutivas sem autorização explícita.
4. Não armazenar, imprimir ou versionar valores reais de `.env*`, senhas, tokens e chaves. Não reconectar OpenAI nem baixar modelos sem nova autorização.
5. Validar autorização por usuário em todas as rotas novas e validar entradas de API.
6. Usar alterações de esquema em migrações incrementais e compatíveis com dados existentes.
7. Construir interface responsiva em português brasileiro, com bom feedback para erros e estados de carregamento.
8. Não afirmar teste, deploy ou publicação não realizados. Não implantar automaticamente sem solicitação explícita.
9. Para mudanças relevantes, propor branch/PR em vez de modificar diretamente a produção.
10. Busca web está implementada como resultados/trechos com fontes, sem modelo generativo. Upload, voz, cobranças e multiusuários administrativos continuam futuros.

## Verificação e entrega
- Com dependências instaladas, executar `npm run typecheck` e `npm run build`.
- Revisar `git diff`, evitar segredos e verificar fluxos afetados (login, chat, histórico, logout).
- Informar arquivos alterados, causa, testes realizados, resultado e estado de deploy.

## GitHub autorizado
Este projeto usa o repositório `luisgussamazon/baixardado`, preservando FANS na branch `backup-fans-before-a3x-ai`. Não usar ou alterar outro repositório.
