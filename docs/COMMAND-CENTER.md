# A3X Autonomous Command Center

## Auditoria e arquitetura

Base auditada em 13/11/2026: Next.js 15 App Router, React 19, TypeScript, PostgreSQL (`pg`), migrações incrementais e build standalone Railway. Login por scrypt e sessão HttpOnly com hash; memória, conhecimento, conversas e projetos vinculados ao usuário. O catálogo de código contém somente fontes públicos selecionados. A ponte Qwen é independente e preservada.

O adaptador OpenAI já usa Responses REST, `gpt-6-luna`, chave somente no servidor, `store:false`, timeout e ledger transacional com teto compartilhado de US$5/mês. Sem SDK adicional. Não há justificativa para substituir esse adaptador ou instalar outro editor pesado: a visualização inicial reaproveita o destaque de sintaxe existente e diffs de substituições exatas.

O ciclo antigo executa políticas estáticas e testes/typecheck/build em Docker, mas publica diretamente na main. O novo pedido exige PR e aprovação independente para produção. A nova fila e o publicador de branches devem cumprir essa regra; o mecanismo legado será suspenso por migração compatível. Nenhum agente pode ampliar `WRITABLE_SOURCE` ou modificar autenticação, credenciais, SQL, dependências e CI.

## Plano de implementação

1. Fila PostgreSQL privada por usuário, eventos, leases e estados auditáveis. A versão remota também trouxe Astro (`014_astro_tasks.sql` e `015_astro_cycle_link.sql`): Astro permanece como identidade da tarefa; `016_engineering.sql` acrescenta os detalhes de execução vinculados pelo mesmo ID, sem duplicar objetivos. Tarefas Astro pendentes de até 1.000 caracteres e com consentimento podem ser assumidas pelo novo runner. Objetivos antigos maiores continuam preservados no Chat X e precisam ser reduzidos pelo responsável antes da execução nova.
2. Central responsiva com três painéis redimensionáveis, catálogo, propostas e resultados reais.
3. Orquestração de seis responsabilidades: Architect e Coder usam o modelo existente; Security usa políticas estáticas; Tester usa contêiner; Optimizer compara medidas; Evolution registra e abre PR. Não são seis modelos independentes.
4. Runner GitHub autenticado por OIDC, com comandos fixos, controles de pausa/cancelamento e recuperação sem repetir chamadas incertas.
5. Integração local VS Code com consentimento e restrição ao workspace; nenhum shell livre.
6. Validação descartável, testes, typecheck, build e CI. Implantação depende de aprovação independente, conforme pedido atual.

Referências oficiais verificadas: https://developers.openai.com/api/docs/models/gpt-6-luna e https://developers.openai.com/api/docs/guides/function-calling. Disponibilidade real depende da conta; não alterar o modelo silenciosamente. Ferramentas são operações validadas pela aplicação, não autorização irrestrita do modelo.

## Operação e permissões

- `/central` e suas seções exigem a sessão existente. O Chat embutido reutiliza o mesmo componente, histórico, consentimentos e streaming; `/chat`, `/programador`, `/chat-x`, memória, conhecimento e navegador continuam acessíveis.
- `/api/engineering` permite somente criar e controlar tarefas do usuário autenticado, com origem validada. Os eventos e propostas são privados. O histórico legado de ciclos também passa a ser filtrado pelo usuário que pagou a execução.
- `/api/engineering/worker` aceita somente JWT OIDC do workflow `a3x-engineering.yml`, na main do repositório e IDs fixos. Tokens de sessão, outro workflow, fork ou repositório não autorizam execução. O runner possui apenas o token efêmero de Actions; a aplicação não precisa de PAT/GitHub App secret novo.
- Architect usa function calling na Responses API com `list_sources`, `read_source` e `search_sources`. Essas ferramentas não acessam rede arbitrária, banco privado ou filesystem local. Até quatro rodadas/seis ferramentas por planejamento, contexto de 32 mil caracteres e 1.200 tokens de saída por rodada. Cada chamada reserva consumo no ledger global já existente. Sem retries de chamadas incertas.
- Coder gera uma substituição curta, com os limites existentes de escrita. Security verifica a política estática e os hashes. Tester executa os três comandos fixos na base e na versão experimental, sem rede, root, credenciais ou fontes graváveis. Optimizer registra durações e variação de bytes; uma diferença de duração **não demonstra** melhoria de desempenho. Evolution abre branch e PR, sem escrever na main ou executar deploy.
- O código gerado nunca controla comandos do host. Os únicos comandos de validação são `npm test`, `npm run typecheck -- --incremental false` e `npm run build` dentro do Docker. Não há terminal livre no navegador: o terminal exibe eventos auditados.
- O publicador legado de main está desabilitado, o agendamento antigo foi removido e a migração pausa sua política. A integração controlada prepara o PR e aguarda revisão independente; **não há merge automático nem configuração automática de proteção de branch**. Configure revisores/checks no GitHub antes de habilitar produção.

## Fila, pausa e recuperação

O planejamento recebe até cinco registros técnicos anteriores da mesma conta: estado, etapa, hashes públicos e métricas. Não inclui objetivos antigos, conversas, documentos ou hipóteses privadas. A interface pede consentimento para esse contexto técnico. A hipótese e o critério descritivo sugeridos pelo modelo ficam registrados para revisão; a aprovação automática para abrir PR é limitada a escopo, integridade e testes/typecheck/build aprovados, não a uma prova de qualidade ou de ganho de desempenho.

O workflow consulta a fila a cada 15 minutos, sujeito a atrasos/cotas do GitHub. Sem tarefa, não faz checkout nem instala dependências. Uma execução por vez, no máximo três tarefas por usuário em 24h, duas pendentes e duas tentativas explícitas por tarefa. Cada lease dura 30 minutos e é renovado. Um runner perdido marca a tarefa como falha; não repete automaticamente geração paga cujo resultado é incerto.

Pausar/cancelar invalida o lease. Durante o Docker, o runner consulta o lease a cada dez segundos e remove o contêiner ao abortar. Durante inferência já enviada, a chamada pode ainda consumir tokens; a próxima etapa/rodada verifica o controle e nenhuma publicação é autorizada. Retomar exige ação explícita e pode consumir novamente. Invalidar a versão experimental recusa seu uso posterior no app; não fecha um PR já aberto nem reverte produção. A extensão pode restaurar o conteúdo original no worktree se o usuário não o alterou depois.

Os controles não podem garantir cancelamento atômico de uma operação externa que já ocorreu: uma branch/PR pode existir se o cancelamento acontecer entre a autorização e a resposta do GitHub. Não há merge ou deploy nesse caminho. A falha fica registrada para revisão.

## VS Code

Ver `extensions/a3x-workspace/README.md`. Pareamento explícito por código em `/central/configuracoes`; tokens só em memória no computador e como hash no PostgreSQL. Expiração de oito horas, revogação por proprietário. Não usar senha de login em scripts nem persistir essa credencial.

A extensão lê e pesquisa localmente apenas os caminhos públicos do manifesto, visualiza diffs de propostas da própria conta já verificadas no runner e aplica com confirmação em worktree isolado, com checkout limpo, base e blobs exatos. Não envia arquivos locais automaticamente, não executa código gerado no computador e não opera outros repositórios. Testes/build são solicitados pela fila web, não por shell local. Não é um agente com acesso irrestrito ao VS Code ou ao sistema operacional.

## Instalação e publicação

1. Node 22+, dependências do lockfile: `npm ci`.
2. Em banco **descartável** com dados de teste, execute `npm run db:migrate`. Testes automatizados usam PGlite e reaplicam as migrações novas, sem acessar produção.
3. `npm test`, `npm run typecheck`, `npm run build`; `npm run dev` para abrir `/central` com login.
4. Em GitHub Actions, permita criar PRs nas configurações do repositório. O workflow requer `contents:write`, `pull-requests:write` e `id-token:write`. Essas permissões precisam existir na conta/repositório; o app não as concede a si mesmo.
5. Publicação desta implementação exige aprovação independente conforme o pedido atual. Depois do deploy aprovado, migrações 016/017 são aplicadas pelo migrador normal e o workflow instalado na main consulta a fila. A aplicação precisa estar no domínio fixo autorizado ou o mantenedor deve revisar os endpoints fixos antes de mudar o host.
6. Para habilitar uma tarefa de desenvolvimento, selecione/autorize GPT-6 Luna no Chat e confirme o envio do objetivo/código público ao modelo e runner. O código proposto em PR é público; o texto privado do objetivo não é copiado para o PR.

Variáveis existentes preservadas: `DATABASE_URL`, `OPENAI_API_KEY` somente no servidor, `OPENAI_ENABLED`, `OPENAI_MONTHLY_BUDGET_USD` (padrão 5), `A3X_AUTONOMY_ENABLED`. Nova variável opcional `A3X_ENGINEERING_ENABLED=0` bloqueia o runner; ausente permite apenas execuções OIDC válidas. `RAILWAY_GIT_COMMIT_SHA` fornece a versão da aplicação quando presente. Não há segredo novo obrigatório.

## Limitações e evidências

Não são seis modelos independentes, não há treino de pesos, nem prova formal de segurança dos filtros estáticos. A escrita permanece nos nove arquivos revisados, com Chat/seletor restritos a texto; desenvolvimento arbitrário de backend, dependências e banco exige revisão humana fora do agente. O editor é uma visualização segura com destaque e diff de trechos, não Monaco com execução de plugins. Métricas de CPU, memória, cobertura, latência e supostos ganhos não são inventadas.

O protótipo não configura sozinho GitHub App, proteção de branch, revisores ou deploy, não instala a extensão na máquina do usuário e não testa acesso real da conta a ferramentas do modelo sem uma execução autorizada. Testes usam respostas simuladas; confirmação de integração real depende do deploy aprovado, instalação/pareamento e execução observada. GitHub Actions/Railway têm custos próprios além do teto de API. Layout ainda requer revisão visual em navegador real; testes de DOM não substituem essa etapa.
