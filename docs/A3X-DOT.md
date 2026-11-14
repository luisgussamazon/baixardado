# A3X DOT — primeira entrega operacional

Branch: `feature/a3x-dot-agentes`. Sem merge, implantação ou alteração de produção nesta implementação.

## Auditoria e plano atualizado

| Módulo existente | Reutilização |
| --- | --- |
| `components/chat-app.tsx`, `/api/chat`, conversas/mensagens | Mesmo Chat, SSE, login, histórico, busca web e seletores Luna/Qwen. Hooks opcionais para estado e preparação de engenharia; nenhuma segunda chamada de modelo para animar. |
| Astro + `engineering_tasks`/`engineering_events` | Identidade única da tarefa, fila, pausa/cancelamento, leases, tentativas, eventos e resultados. Inserção extraída para helper compartilhado para não duplicar cotas. |
| `engineering-engine`, ferramentas, catálogo e política de fontes | Architect/Coder e nove caminhos editáveis existentes. DOT não pode escrever seus próprios módulos de controle. |
| Adaptadores Luna e `ai_api_usage` | Mesmo modelo, consentimento por conta, reservas conservadoras e ledger global. Teto validado em no máximo US$5, sem aumento configurável acima disso. |
| `a3x-engineering.yml` + endpoint OIDC | O claim periódico chama a observação DOT e pode enfileirar uma investigação autorizada antes de assumir trabalho. Nenhum novo cron, workflow, serviço ou token. |
| Sandbox, preparação/publicador de engenharia | Testes, typecheck e build sem rede/credenciais; comparação de medidas; branch/PR somente após recibo validado. Nenhum merge ou deploy. |
| `cognitive_records`, conhecimento, memória e pesquisa | Mimo mostra contagens por proprietário e encaminha aos controles existentes. Memórias pendentes geram aviso; nenhum documento pessoal é enviado pelo agendador. |
| GitHub/VS Code, Programador e Chat X clássico | Rotas e componentes anteriores preservados; ferramentas clássicas acessíveis por uma seção expansível. |

As fases visuais e operacionais fazem parte da mesma entrega:

1. **A — Identidade:** quatro SVGs originais, estados leves CSS, teclado, arraste limitado à área dos agentes, minimização, modo silencioso, temas e redução de movimento.
2. **B — Chat e memória:** `/chat-x` é a experiência DOT, com o Chat existente e sua persistência. Pipo reage ao envio real; pedidos imperativos de engenharia preparam confirmação. Mimo consulta somente contagens da conta e dá acesso à memória/Ensinar existentes.
3. **C — Execução:** ações de engenharia são criadas na fila real após confirmação. Nino apresenta hipótese/critério; Bubu usa estágio/estado e resultados efetivos, com links de execução, diff e PR.
4. **D — Autonomia:** observação determinística agendada, avisos deduplicados e investigação paga opt-in persistida em banco, usando o runner e o pipeline existentes. Não é uma simulação visual.
5. **E — Validação:** migração aditiva 018 em PGlite descartável, testes com Luna simulada, testes de UI, tipos, build e CI isolado. Validação visual em navegador real/Extension Host e execução paga em produção continuam separadas e exigem ativação autorizada.

## Ciclo operacional

**Detectar → Investigar → Planejar → Propor → Testar → Comparar → Registrar → Pull Request.**

O Nível 1 cria/atualiza preferências padrão e evidências em `dot_settings`/`dot_findings`: tarefas interrompidas, fila, conclusões, propostas em revisão e memórias que realmente aguardam aprovação. Usa bloqueio da linha de preferências e chave única por usuário/evento; repetir tick ou abrir várias abas não duplica a evidência. Estado terminal novo pode antecipar uma varredura na abertura do Chat X. Não há inferência, busca web ou chamada paga nesse nível.

No workflow de engenharia confiável, o tick visita até 20 contas por passagem, com orçamento de cinco segundos entre contas e consultas limitadas pelo PostgreSQL. A ordenação favorece contas ainda não observadas ou mais antigas. Uma falha isolada não deve bloquear as outras contas. O cron de 15 minutos é a frequência desejada, não garantia de pontualidade do GitHub.

O Nível 2 começa **desligado**. Ativar exige selecionar/autorizar Luna no mecanismo existente, habilitar Nível 2 e salvar consentimento específico. Só investiga uma falha real anterior, não uma oportunidade inventada. A nova investigação usa objetivo técnico fixo com código do erro e identificador da tarefa; não copia objetivo antigo, histórico pessoal ou documentos. O job é vinculado à tarefa Astro/Engineering e segue a preparação, testes, comparação e publicador existentes. Investigações geradas que falham não geram outras investigações em cadeia. A fonte anterior só pode originar um job automático.

O agendador enfileira, mas não executa código nem chama a OpenAI. Reservas do ledger são verificadas imediatamente antes das chamadas reais pelos adaptadores originais. Se não há melhoria segura, o modelo pode concluir sem editar nada; não é fabricado um PR para satisfazer a animação.

## Controles e custos

| Controle | Limite |
| --- | --- |
| Observação | Sem API; 15 minutos ou evento terminal novo na abertura; até 50 tarefas por conta/varredura |
| Investigação automática | Uma por conta/24h; apenas fonte real não investigada e não gerada pelo DOT |
| Fila total | Mesmas três tarefas/24h e duas pendentes, compartilhadas com solicitações manuais |
| Luna por tarefa DOT | Até cinco chamadas (quatro Architect + uma Coder), sem retry incerto |
| Reserva acumulada DOT | Até 30.000 microunidades de dólar (US$0,03) de reservas calculadas; rejeições também consomem essa margem conservadora da tarefa |
| Saldo antes de enfileirar | Pelo menos US$0,03 de margem no ledger compartilhado; cada chamada ainda exige reserva global própria |
| Orçamento mensal | `OPENAI_MONTHLY_BUDGET_USD=5`, ou menor; nunca acima de 5 |
| Tempo | Preparação até 210s, chamadas até 90s, runner até 55min; job DOT expira uma hora após criação |
| Escrita | Somente repositório e nove caminhos já autorizados; políticas, CI, SQL, dependências e credenciais permanecem fora do alcance do agente |
| Produção | Somente branch/PR. Revisão humana independente para merge/deploy |

A margem para enfileirar não é uma reserva do mês: a reserva financeira ocorre no ledger antes de cada chamada, evitando nova operação paga sem saldo reservado. O orçamento por tarefa mede reservas conservadoras calculadas com o contrato do adaptador, não garante a fatura real do provedor. Uso simultâneo pelo Chat pode interromper uma investigação nas próximas chamadas. Valores reportados, mudanças de preço, outras aplicações usando a chave e infraestrutura não são controlados por essa margem. GitHub Actions, Railway e PostgreSQL têm consumo separado do teto da OpenAI.

Pausar o Nível 2 pausa somente suas tarefas DOT pendentes/em execução e revoga a autorização nos próximos limites de etapa, inclusive heartbeats e rodadas. Uma chamada já autorizada/em curso pode terminar; não há cancelamento remoto garantido nem retry. Retomar uma execução interrompida continua explícito e não zera contador, reserva ou tentativas. Modo silencioso oculta sugestões; não equivale a desligar o motor. O controle geral e `A3X_DOT_ENABLED=0` desativam a autonomia, mantendo o Chat e a consulta aos resultados.

## Interface e origem visual

Pipo coordena e mostra envio real no Chat; Nino usa estágios Architect/Coder/Security; Bubu usa Tester/Optimizer e falhas; Mimo apresenta registros e memórias. São responsabilidades de uma integração, não quatro modelos, processos conscientes ou serviços separados.

`components/dot-mascot.tsx` contém desenhos vetoriais originais criados nesta implementação. Formas, cores, olhos e animações foram desenhados em código, sem imagens, fontes ou personagens de terceiros. Não foi incorporado novo pacote gráfico. Ícones e bibliotecas preexistentes mantêm suas licenças próprias. A estrutura permite novas skins sem carregar mídia externa.

O arraste fica numa área reservada, com teclado, sem cobrir editor, botões ou compositor. CSS respeita `prefers-reduced-motion`; animações param ao ocultar a página e podem ser desligadas. Polling de estados ocorre a cada 15s somente com a página visível; não há loop JS de animação ou modelo ativo para manter mascote acordado.

## Ativação após aprovação

1. Revisar este documento, resultados dos testes e consumo de infraestrutura. Aprovar explicitamente o deploy.
2. A migração 018 é incremental e não apaga dados existentes. O processo de migração de produção só será executado no deploy autorizado.
3. Confirmar `OPENAI_MONTHLY_BUDGET_USD=5` (ou menor), serviços/chaves originais e o runner. Nenhuma nova credencial é necessária.
4. Após publicação, Nível 1 fica habilitado por padrão. Para impedir toda autonomia, definir `A3X_DOT_ENABLED=0` no servidor.
5. Abrir `/chat-x`, **Meus agentes**. Autorizar Luna no seletor existente e depois o Nível 2 com consentimento específico se desejar processamento pago. O Nível 2 não se ativa automaticamente com a chave.
6. Conferir os eventos e PR; nunca interpretar animação, plano ou tempo de teste como evidência de melhoria por si só.

## Limitações reais

Sem navegador/shell livre, publicação autônoma, acesso a outros repositórios ou alteração de seus controles. A iniciativa é determinística e baseada em estados, não um processo generativo sempre acordado. Nível 2 automático investiga falhas de engenharia; novas capacidades também podem ser solicitadas manualmente, sempre no escopo. Propostas em revisão e memória pendente produzem avisos, sem autorizar publicação ou aprovar memórias. Pesquisa web continua no Chat sob os consentimentos existentes, nunca disparada pelo cron. A interface não treina pesos. Não há promessa de inteligência ilimitada ou resolução garantida.
