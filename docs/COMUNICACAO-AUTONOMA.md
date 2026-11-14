# Comunicação e iniciativa dos assistentes

Evolução da experiência Living Agents, em `feature/a3x-agent-dialogue`, sobre `301d123`.

## O que mudou

- O mini chat responde diretamente sobre andamento, falhas, próximos passos, memória, orçamento e autorização da autonomia, usando somente o snapshot privado da conta. Saudações e identidade institucional também são locais. Não chama modelo nem buscador.
- Pipo coordena; Nino apresenta hipóteses e propostas; Bubu acompanha verificações; Mimo apresenta contagens de memória e aprovação. Os textos não alegam testes passando, aprendizado ou publicação sem evidência.
- Perguntas fora desse conjunto seguem como rascunhos para o Chat completo, com confirmação de envio no compositor existente. A conversa breve guarda até seis pares de pergunta/resposta na sessão da camada; não substitui nem apaga o histórico persistente do Chat.
- Avisos priorizam revisão, falhas, execução, memória, fila e conclusão. Etapas em execução usam o estado real da tarefa; nenhum percentual é inventado. Avisos obsoletos são retirados quando o diagnóstico/estado muda.
- Dispensar um achado persistido usa a API autenticada existente. Se a gravação falhar, o aviso permanece aberto com erro e pode ser repetido. Avisos transitórios de etapa são deduplicados somente na sessão do navegador.
- O painel da tarefa usa o mesmo diagnóstico em português do mini chat. Há atalhos para evidências e preparação de investigação; preparar não envia código nem inicia uma chamada paga.

## Avanço da autonomia

O scheduler agora considera investigações autorizadas pendentes mesmo se uma leitura recente do painel atualizou `last_scan_at`. Assim, acompanhar o painel não adia indefinidamente o trabalho pago autorizado.

Antes de enfileirar uma nova investigação, faz triagem determinística do código registrado. Só são candidatos os códigos conhecidos de planejamento `PLAN_FORMAT`, `PLAN_CONTEXT`, `PLAN_TOOLS`, `PLAN_TOOL_SCOPE`, `PLAN_TOOL_FINAL` e `PLAN_TOOL_LIMIT`. A classificação não comprova a causa raiz nem que há uma correção possível nos nove arquivos permitidos. A Luna ainda pode concluir que não existe mudança segura.

Falhas de acesso, credencial, orçamento, quota, consentimento, timeout, resposta incompleta ou diagnóstico desconhecido recebem orientação local, sem criar outra investigação paga. Operações incertas não são repetidas. O bloqueio global também é aplicado na entrada direta da fila.

Preservados: consentimento por conta, uma investigação automática por 24h, cinco chamadas por tarefa, US$0,03 em reservas acumuladas, teto compartilhado de US$5, quotas Astro, proprietário, deduplicação da origem, prazo, políticas de escrita, sandbox e PR. Não há alteração de SQL, credenciais, CI ou políticas pelo agente; não há merge/deploy autônomo.

## Validação e limites

Suíte local: 235 testes aprovados, zero falhas. Typecheck e build aprovados. Os testes de comunicação, UI e banco descartável são repetidos após ajustes finais; os checks do PR validam o commit publicado. Chamadas Luna simuladas, sem consumo real de API nem dados de produção.

Cobertura: triagem, filtro de perguntas fora de domínio, prioridade e invalidação de avisos, resposta dentro do balão sem API paga, falha e recuperação ao dispensar, isolamento entre contas, scheduler com scan recente, cotas, pausa e limites existentes. A migração 018 permanece a mesma e é usada somente no banco descartável dos testes.

Limitações: mini chat determinístico, sem compreensão geral ou treinamento de pesos. O Chat completo mantém a integração generativa existente. O intervalo do GitHub não tem SLA; orçamento/configuração podem impedir uma execução. Conversas breves não sobrevivem a recarregar a página. Infraestrutura e fatura externa não são garantidas pelo orçamento interno.
