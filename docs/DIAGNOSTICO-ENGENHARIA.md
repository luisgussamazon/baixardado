# Diagnóstico de interrupções de engenharia

As capturas de 14/11/2026 confirmam que o dispatch foi aceito e o runner entrou em Architect. O erro de permissão GitHub foi superado; o registro histórico genérico não contém informação suficiente para determinar se houve rejeição da OpenAI, falha no plano ou outro problema. Não foi realizada outra chamada paga para descobrir isso, nem a causa foi presumida.

O tratamento antigo ocultava todos os erros com a mesma mensagem e gravava um novo evento a cada tentativa de encerramento/heartbeat após a tarefa já falhar. Agora:

- Rejeições HTTP do planejamento viram códigos e mensagens fixas: `AI_AUTH`, `AI_ACCESS`, `AI_MODEL`, `AI_REQUEST`, `AI_LIMIT`, `AI_UNAVAILABLE`.
- Também são distinguidos orçamento interno, consentimento, concorrência, prazo, plano inválido/incompleto, ferramentas/contexto e lease. Erros desconhecidos permanecem anônimos.
- Nunca são ecoados corpo da resposta do provedor, mensagem arbitrária, chave, objetivo ou stack trace privada.
- A transição atômica `running → failed` guarda `result.failureCode` e emite o evento uma única vez. Requisições posteriores não duplicam a falha.
- O runner registra somente um código de uma lista fechada no GitHub. Nenhum controle de permissão ou execução foi removido.
- A interface explica o limite de duas tentativas e deixa de mostrar “runner acionado” quando a tarefa já saiu da fila.

Nenhuma migração ou aumento dos limites foi feito. A tarefa antiga não ganha um diagnóstico retroativo e não tem suas tentativas zeradas. Um diagnóstico real de uma próxima execução depende de publicação aprovada e ação explícita do responsável, preservando o teto da API.

Referências oficiais consultadas: https://developers.openai.com/api/docs/guides/error-codes e https://developers.openai.com/api/reference/resources/responses/methods/create. Os testes usam respostas simuladas, sem segredos ou chamadas pagas.

Verificação local em 14/11/2026: `npm test` com 220 aprovados, zero falhas/ignorados; `npm run typecheck` e `npm run build` aprovados; `node --check scripts/engineering-runner.mjs` e `git diff --check` aprovados. Os testes do classificador também foram repetidos após endurecer a consulta à lista fechada de mensagens. Nenhuma execução real foi reacionada nesta investigação e nenhum deploy desta correção foi realizado.
