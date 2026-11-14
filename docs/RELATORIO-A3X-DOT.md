# Relatório — A3X DOT

## Entrega e estado

Implementação na branch `feature/a3x-dot-agentes`, sem merge, deploy ou alteração de banco de produção. O plano atualizado e o inventário de arquitetura estão em `docs/A3X-DOT.md`. A autonomia é funcional na aplicação: observação persistida e agendada por padrão, opt-in pago que cria trabalho na fila real, confirmação de tarefas manuais, limites e interrupção verificados nos adaptadores. Não é uma tela que simula tarefas.

Pipo/Nino/Bubu/Mimo são componentes SVG originais ligados ao estado real de Chat e engenharia, com estados, animações, minimização, arraste limitado e teclado. Inclui Meus agentes, tema claro/escuro, silêncio, frequência, desligamento e consentimento. O Chat X clássico continua acessível, assim como Chat, Programador, histórico, memória, conhecimento, Qwen, busca e conexões.

## Arquivos

- `sql/018_dot_agents.sql`: preferências, evidências deduplicadas e vínculo único entre origem e investigação. Incremental, sem apagar dados anteriores.
- `lib/dot-policy.ts`: classificação determinística, intenções restritas e estados dos personagens; validação fechada de configurações.
- `lib/dot-engine.ts`: observação agendada, criação controlada da investigação, proteção contra cascata/retry, quotas, pausa, prazo e reservas por tarefa.
- `lib/engineering-queue.ts`: cotas e criação Astro/Engineering compartilhadas, sem duplicar identidades.
- `app/api/dot/route.ts`: API autenticada, origem/JSON validados, proprietário em todas as consultas/alterações; somente contagens de memória e metadados de tarefa.
- `app/api/engineering/route.ts`: usa a criação compartilhada, mantendo cotas e dispatch existentes.
- `app/api/engineering/worker/route.ts`: executa tick DOT depois de validar OIDC, antes de claim; falha da observação não deve bloquear a fila manual.
- `lib/engineering-engine.ts`: valida autorização DOT nos leases, antes das rodadas e do Coder; revalida consentimento antes do Coder.
- `lib/openai-engineering.ts`, `lib/openai-luna.ts`: callbacks opcionais de autorização/reserva; mesmo adaptador, modelo, ledger e número de chamadas.
- `lib/ai-provider.ts`: não permite configurar teto compartilhado superior a US$5.
- `lib/engineering-errors.ts`, `scripts/engineering-runner.mjs`: códigos sanitizados para pausa, limite e prazo DOT; sem expor dados brutos.
- `components/dot-mascot.tsx`: quatro personagens vetoriais originais.
- `components/dot-workspace.tsx`, `components/dot-workspace.module.css`: Chat X DOT, evidências, preferências e animações acessíveis/responsivas.
- `components/chat-app.tsx`: hooks opcionais de atividade/encaminhamento, sem alterar o protocolo de Chat nem repetir chamadas.
- `app/api/chat/route.ts`, `lib/local-model.ts`: persona DOT validada por enum e incluída no mesmo orçamento de contexto, sem mensagem extra ou chamada duplicada; histórico longo e compartilhamento documental continuam sujeitos aos limites existentes.
- `components/command-center.tsx`: recebe objetivo preparado para confirmação, sem execução automática pela URL.
- `app/chat-x/page.tsx`: acesso DOT com a sessão existente.
- `tests/dot-engine.test.ts`, `tests/dot-ui.test.tsx`: novos fluxos, limites e consentimento; `tests/engineering.test.ts` inclui a nova migração no banco descartável.
- `tests/openai-luna.test.ts`: verifica persona na mesma chamada e mantém o bloqueio de envio documental não autorizado; personagem inválido não chama modelo.
- `README.md`, `.env.example`, `docs/A3X-DOT.md`, este relatório: entrada, configuração e limites.

## Verificações

Em 14/11/2026, `npm test`: **223 testes aprovados, zero falhas e zero ignorados**. `npm run typecheck` e `npm run build` aprovados. Os testes focados de DOT foram repetidos após o ajuste final do carregamento da interface e passaram; a compilação final foi repetida para esses ajustes. O resultado do CI e do Docker deve ser conferido no PR antes de ativar em produção.

A migração 018 foi aplicada e reaplicada em PGlite descartável. Testes cobrem: padrão sem API; agendamento e execução única por fonte; estados/avisos reais; bloqueio de origem e acesso sem sessão; isolamento entre contas; consentimento duplo; oito verificações principais de pausa/cap/prazo; cinco chamadas simuladas até uma proposta; margem financeira global e acumulada; proibição de investigar uma investigação gerada; quota compartilhada Astro; controle por teclado, minimização, histórico, ausência de sucesso fictício e CSS de movimento reduzido.

Os testes existentes de sandbox e publicador continuam na suíte: workspace e dependências somente leitura, sem rede/credenciais/root, verificações fixas e PR apenas com recibo validado. Não foi executado código proposto por IA no computador ou servidor de produção. Não houve chamada real à Luna, consulta a dados de produção ou instalação de dependências adicionais.

## Recursos e limites de validação

Build local: `/chat-x` com 13,6 kB de rota e 174 kB de primeiro carregamento, conforme relatório do Next.js; não é benchmark de latência nem medida de CPU. Animações CSS/SVG, sem mídia externa, loop JS por frame ou modelo acordado. Há uma leitura de estados a cada 15s com a página visível e observação do banco por intervalo/evento. O cron existente recebe consultas extras limitadas; se o Nível 2 for autorizado, poderá usar tempo de GitHub Actions, Railway/PostgreSQL e a API compartilhada.

Não houve teste visual em navegador real, medição de FPS, carga concorrente em um PostgreSQL TCP ou execução paga/PR real pelo DOT. Testes com PGlite não provam desempenho de produção. A instalação VS Code e os fluxos autenticados de navegador real continuam externos a esta implementação. Os SVGs não importam arte ou fontes de terceiros; bibliotecas existentes mantêm suas licenças. O orçamento interno não é garantia absoluta da fatura OpenAI ou de custos da infraestrutura.

## Aprovação pendente

Revisar testes/CI, migração aditiva, frequência de observação e custos externos ao ledger. Somente depois autorizar o deploy no Railway. Mesmo após o deploy aprovado, Nível 2 permanece desligado até consentimento específico por conta e consentimento Luna existente. Nenhum PR gerado pelo agente pode fazer merge/deploy sozinho.
