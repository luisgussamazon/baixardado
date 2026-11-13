# Relatório — A3X Autonomous Command Center

Data de referência: 13/11/2026. Repositório único: `luisgussamazon/baixardado`. Branch: `feature/a3x-command-center`.

## Entrega implementada

- Central `/central`, navegação em português, tema grafite/azul/ciano, layout de três painéis redimensionáveis por ponteiro ou teclado e reorganização em telas menores. Indicadores operacionais vêm do backend; ausências são identificadas, sem percentuais fictícios.
- Chat reutilizado, com histórico e streaming existentes, seletor de modelo, consentimentos e acesso ao Chat completo/Programador. Login passa a abrir a Central; somente um código hexadecimal de pareamento pode atravessar esse redirecionamento.
- Catálogo público de fontes, código com destaque, cópia, diferenças entre original/proposto e memória técnica da tarefa. Não executa o código exibido.
- Fila persistida no PostgreSQL, ligada ao ID da tarefa Astro existente, eventos privados, limites, leases, pausa/retomada/cancelamento e recuperação explícita após falha. A navegação antiga continua disponível.
- Architect e Coder com o modelo configurado; Security, Tester, Optimizer e Evolution como responsabilidades verificáveis do runner. Os agentes sem eventos aparecem sem execução.
- Planejamento via Responses/function calling com ferramentas de leitura restritas. Geração de substituições exatas; ledger e teto de US$5/mês compartilhados com o Chat; nenhuma chave no navegador.
- Workflow GitHub OIDC processa uma tarefa, executa base e candidato em Docker sem rede/credenciais, compara medidas, publica somente branch e PR. Não escreve na main, faz merge ou deploy. O fluxo antigo de publicação direta é desativado no código e pausado pela migração quando esta versão for implantada com aprovação.
- Extensão VS Code com pareamento, seleção explícita do repositório A3X, leitura/pesquisa local, diff, aplicação confirmada em worktree e reversão protegida por hash. Tokens em memória por até oito horas e somente hashes no banco.
- Correção de privacidade no histórico legado de ciclos: consulta limitada ao usuário responsável pelo consumo, em vez de devolver todos os resumos às demais contas.

## O que foi verificado localmente

- Suíte completa: **211 testes aprovados**, zero falhas. Depois foi acrescentada e executada uma regressão de redirecionamento seguro no login; os três testes desse arquivo passaram.
- Testes de engenharia passaram com PostgreSQL descartável PGlite: migrações 016/017, reaplicação da 016, isolamento de contas, integração Astro, controle de lease, cancelamento, limite de tarefas, function calling simulado, reservas de consumo e bloqueio de replay.
- Pareamento testado sem credenciais reais: aprovação única, hash persistido, consulta da conta autorizada e revogação por proprietário; tentativa de revogar conexão alheia não concede acesso nem altera o dono.
- Publicação testada com GitHub simulado: somente branch/PR, hashes obrigatórios, base exata, nenhuma atualização da main e nenhum objetivo privado copiado para o PR.
- Aplicação/reversão de uma alteração de teste **real em filesystem e Git descartáveis**: arquivo original preservado no checkout principal, candidato escrito em branch/worktree isolado e conteúdo restaurado. Nenhum código proposto foi executado nesse teste.
- Bloqueios de traversal, arquivos secretos, novos escopos/comandos e sobrescrita de alterações posteriores testados. Verificação de symlinks também roda no teste Linux; no Windows depende das permissões do sistema.
- Typecheck e build standalone aprovados durante a implementação. A CI do PR executa novamente suíte, typecheck, build e validação Linux/Docker sobre o commit revisado.
- `npm audit`: **zero vulnerabilidades** informadas na consulta das dependências instaladas, sem instalar/atualizar pacotes.
- A CI do primeiro commit desta branch aprovou a suíte, typecheck, build e o job Linux/Docker. A revisão final acrescentou uma regressão de bloqueio de formatos sensíveis em patches/objetivos; os testes de política e engenharia passaram. O estado do último commit deve ser confirmado nas verificações do PR.

Nenhum teste ou migração de teste acessou o PostgreSQL de produção. Nenhuma chamada paga real à OpenAI foi feita por esses testes. Nenhum merge ou deploy desta implementação foi realizado.

## Limitações que permanecem

1. O ciclo novo ainda precisa ser implantado e observado com OIDC/API reais. A documentação oficial confirma `gpt-6-luna` e function calling em Responses, mas testes simulados não provam disponibilidade na conta.
2. A extensão foi testada no nível de filesystem/protocolo; falta instalar/autorizar e exercitar um Extension Host real. Não afirma que o VS Code do usuário já está conectado.
3. O GitHub precisa permitir criação de PR por Actions. A aplicação não concede esse privilégio, não configura revisores nem proteção da main. O nível de integração prepara a revisão e aguarda aprovação independente; não há merge automático.
4. O editor é visualização/diff seguro, não Monaco. Eventos são consultados a cada cinco segundos; não há terminal livre, WebSocket de shell ou execução local de código gerado.
5. A escrita continua limitada a nove arquivos revisados; Chat e seletor aceitam somente texto. Não implementa qualquer sistema arbitrário nem altera seus próprios controles, autenticação, banco, dependências ou CI.
6. Diferenças de duração/bytes são medidas de execução, não prova de ganho de performance ou de atendimento de todo critério descritivo do modelo. Filtros estáticos não são prova formal de segurança.
7. A memória técnica compartilha com o planejamento apenas metadados da mesma conta, com consentimento. Não treina pesos, não envia documentos privados do computador nem objetivos anteriores automaticamente.
8. Pausa/cancelamento pode não recuperar tokens de uma chamada já enviada. Não há cancelamento atômico de um PR que já tenha sido criado; main e produção permanecem fora desse caminho.
9. Invalidar a proposta no painel não fecha automaticamente o PR nem reverte produção. A reversão local só restaura um arquivo que não foi modificado depois da aplicação.
10. Revisão visual em navegador real, demonstração com modelo real e ativação do worker/VS Code permanecem pendentes. Não são substituídas por testes de DOM ou fixtures.

## Execução e publicação

Instalação, variáveis, comandos, configuração GitHub e limites: [COMMAND-CENTER.md](COMMAND-CENTER.md). Instalação local do complemento: [README da extensão](../extensions/a3x-workspace/README.md).

A publicação exige aprovação independente, conforme a seção AUTONOMIA do prompt fornecido. Antes dela, manter esta implementação em branch/PR, revisar o diff e concluir a CI. Após o deploy aprovado, realizar pareamento, registrar uma tarefa de observação, depois uma tarefa pequena de desenvolvimento, acompanhar a validação real e revisar o PR produzido antes de qualquer integração.

## Arquivos criados e modificados

- Alterado: `.github/workflows/a3x-autonomy.yml`
- Novo: `.github/workflows/a3x-engineering.yml`
- Alterado: `AGENTS.md`
- Alterado: `README.md`
- Alterado: `app/api/autonomy/route.ts`
- Novo: `app/api/engineering/device/route.ts`
- Novo: `app/api/engineering/route.ts`
- Novo: `app/api/engineering/worker/route.ts`
- Alterado: `app/api/health/route.ts`
- Novo: `app/central/[[...section]]/page.tsx`
- Alterado: `app/login/page.tsx`
- Alterado: `app/page.tsx`
- Alterado: `components/auth-form.tsx`
- Alterado: `components/chat-app.tsx`
- Novo: `components/command-center.module.css`
- Novo: `components/command-center.tsx`
- Novo: `components/workspace-connection.tsx`
- Novo: `docs/COMMAND-CENTER.md`
- Novo: `docs/RELATORIO-COMMAND-CENTER.md`
- Novo: `extensions/a3x-workspace/.vscode/launch.json`
- Novo: `extensions/a3x-workspace/README.md`
- Novo: `extensions/a3x-workspace/extension.cjs`
- Novo: `extensions/a3x-workspace/package.json`
- Novo: `extensions/a3x-workspace/workspace.cjs`
- Alterado: `lib/autonomy-oidc.ts`
- Novo: `lib/engineering-engine.ts`
- Novo: `lib/engineering-policy.ts`
- Novo: `lib/engineering-tools.ts`
- Novo: `lib/openai-engineering.ts`
- Alterado: `lib/source-policy.ts`
- Alterado: `scripts/autonomy-publish.mjs`
- Alterado: `scripts/autonomy-sandbox.mjs`
- Novo: `scripts/engineering-prepare.ts`
- Novo: `scripts/engineering-publish.mjs`
- Novo: `scripts/engineering-runner.mjs`
- Alterado: `source-catalog.json`
- Novo: `sql/016_engineering.sql`
- Novo: `sql/017_engineering_devices.sql`
- Alterado: `tests/auth-form-ui.test.tsx`
- Alterado: `tests/autonomy-oidc.test.ts`
- Alterado: `tests/autonomy-publish.test.ts`
- Novo: `tests/command-center.test.tsx`
- Novo: `tests/engineering-publish.test.ts`
- Novo: `tests/engineering.test.ts`
- Alterado: `tests/source-policy.test.ts`
- Novo: `tests/workspace-extension.test.ts`
