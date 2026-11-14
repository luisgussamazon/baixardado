# A3X Living Agents — experiência DOT

Implementação em `feature/a3x-living-agents`, a partir da versão publicada `7369165`. Atende também à refatoração visual descrita como `fix/a3x-dot-autonomous-ui`; uma única branch evita duas implementações concorrentes. Sem merge, deploy, migração ou mudança em produção nesta entrega.

## Estrutura e causa

O DOT anterior embutia ChatApp e ChatX dentro de uma segunda navegação, com painel permanente e personagem limitado a um deslocamento de 12 pixels. O novo `/chat` e `/chat-x` usam o mesmo ChatApp, com uma apresentação DOT única: sidebar, histórico, conversa, compositor e atividade recolhível. Não há outro ChatApp ou ChatX aninhado. Relatórios/análises continuam como pedidos no Chat, e Projetos/Programador, Memória, Tarefas e conexões existentes são preservados.

`LivingAgentsProvider`, montado uma vez no layout somente para usuários autenticados e identificado pelo ID da conta, compartilha um snapshot privado e posições durante navegações Next. Não persiste conversas em armazenamento do navegador. Login/setup não mostram agentes; uma resposta 401 limpa o snapshot e desmonta a camada. Minimizados/ocultos/fixados e rascunhos são estados de sessão da página, sem persistência após recarregar.

## Movimento e comportamento

- `lib/living-agents.ts`: decisões puras locais, destinos variados com preferência por região/personagem, ritmo próprio, repouso e estados idle/exploring/observing/thinking/speaking/working/resting. Não acessa modelo, rede ou ferramentas.
- `components/living-agents-provider.tsx`: camada de robôs, mini chat, gestos, arraste, fixação, teclado, minimização e restauração. Um único polling a cada 30 segundos enquanto a página está visível. Balões espontâneos respeitam silêncio/frequência e usam achados reais; falas manuais descrevem capacidades sem alegar execução.
- Movimento com `requestAnimationFrame` limitado a aproximadamente 30 atualizações/s e transformações CSS; geometria do DOM é revisada a cada 750 ms. Campos, controles, mensagens, cabeçalhos, sidebar e diálogos são obstáculos. Cada passo é validado, não apenas o destino. Se não há espaço seguro, o personagem é ocultado e continua acessível pelo botão DOT. Layouts densos podem ter menos personagens visíveis.
- Somente um personagem em celulares. Aba oculta, pausa e movimento reduzido desativam animações. Olhar segue o cursor com atualização limitada. Há colisão/afastamento entre robôs; não há diálogo simulado entre eles nem consciência literal.
- SVGs originais em camadas: Pipo branco/azul; Nino roxo com notebook; Bubu azul redondo; Mimo branco/turquesa. Sem 3D, imagens remotas ou novas dependências de runtime.

O mini chat permite digitar e preparar uma pergunta no Chat completo com a persona escolhida. O envio acontece pelo compositor existente, com as mesmas permissões e histórico; abrir um balão ou mover um robô nunca chama a Luna. Links internos preservam a camada durante a navegação.

## Autonomia funcional preservada

Reutiliza integralmente a migração 018 e o motor DOT/Engineering existente: observação determinística, achados, fila Astro, runner OIDC, arquivos autorizados, sandbox Docker, comparação, registro técnico e PR. Não introduz outro agendador ou migração. A atividade aparece junto da conversa e os detalhes de código, verificações e memória ficam recolhidos. Não há percentuais inventados nem afirmação de testes passando sem evidência.

Nível 2 continua desligado até consentimento; máximo de uma investigação automática/usuário/24h, cinco chamadas, US$0,03 em reservas acumuladas por tarefa e orçamento global compartilhado de US$5. Quotas, interrupções, prazo e controles existentes permanecem. Nenhum merge/deploy automático, ampliação de caminhos, alteração de SQL/credenciais/CI/políticas pelo agente.

## PLAN_FORMAT

O Architect solicitava JSON livre com `json_object`, enquanto o servidor exigia três campos específicos. Passou a usar `text.format` com JSON Schema estrito: path limitado à lista existente, hipótese e critério obrigatórios, sem campos extras. O servidor também valida independentemente tamanho, tipo e catálogo realmente disponível. Saídas inválidas continuam interrompidas, sem reparo pago ou retry automático. Não se afirma que todas as falhas de produção foram resolvidas: recusas, respostas incompletas e planos semanticamente inválidos ainda podem acontecer; não houve chamada real nesta implementação.

Contrato conferido na [documentação oficial de Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Não foram alterados modelo, preço, número de rodadas, orçamento ou ferramentas.

## QA e consumo

`scripts/preview-living-agents.mjs` monta os componentes reais com esbuild disponível nas dependências de desenvolvimento e respostas simuladas; serve exclusivamente em 127.0.0.1:4318. Não lê `.env`, banco ou segredos. `scripts/capture-living-preview.mjs` usa Chrome headless com perfil separado e produz imagens e sequência HTML em `.tools/living-review/`. Os dados de demonstração são identificados como simulados. Esses scripts não entram no fluxo de produção.

As capturas verificam desktop 1672×941, celular 390×844, ausência de rolagem horizontal, quatro agentes no desktop, um no celular e respeito a movimento reduzido. A primeira captura revelou um bug de inicialização do RAF; foi corrigido e coberto por teste que executa o primeiro frame. Não é benchmark de CPU/FPS nem teste de carga do PostgreSQL. Sem validação física de dispositivos ou leitor de tela.

Custos: nenhuma chamada de IA para movimento ou fala decorativa. A leitura de estado é compartilhada e passou de 15s para 30s. Há processamento no navegador e consultas leves no servidor; não se promete custo zero de Railway/PostgreSQL/Actions, nem uma fatura exata. A animação não requer GPU hospedada. O orçamento interno da OpenAI não garante a fatura externa.

## Resultado da entrega — 14/11/2026

- `npm test`: 230 aprovados, zero falhas, zero ignorados; bancos descartáveis e chamadas Luna simuladas. Inclui quotas/consentimento e sandbox da suíte existente, movimento, colisões, primeiro frame, navegação sem remontagem, preparação de pergunta sem API paga e memória sem tarefa.
- `npm run typecheck` e `npm run build`: aprovados. A revisão final dos textos foi verificada novamente nos testes de UI.
- Chrome headless local: quatro agentes no desktop, um no celular, movimento entre capturas, mini chat, compositor clicável com 366px no celular, sem overflow horizontal e sem animações em movimento reduzido. Imagens em `.tools/living-review/desktop.png`, `mobile.png`, `mini-chat.png`; sequência reproduzível em `movement.html`.
- Rótulo “Nível 1 gratuito” removido da experiência nova. O cabeçalho informa o estado real: Observação ativa, Luna autorizada ou Autonomia pausada. Isso não remove orçamento, consentimento ou segurança.
- Sem chamadas reais/pagas à Luna, testes de carga, leitor de tela físico ou validação de uma sessão de produção. Não houve mudança de banco/credenciais, merge, push ou deploy. Artefatos visuais usam dados simulados explicitamente identificados.

Ativação/publicação exige nova autorização explícita do responsável. O comportamento visual não é consciência, treinamento automático dos pesos ou acesso irrestrito à máquina.
