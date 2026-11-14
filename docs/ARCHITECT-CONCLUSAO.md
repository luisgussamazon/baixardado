# Architect: inspeção limitada e conclusão

O diagnóstico `PLAN_TOOLS` das capturas de 14/11/2026 confirma uma falha na família de ferramentas, mas o código anterior agrupava diferentes motivos. Foram identificados dois problemas no fluxo: todas as quatro rodadas permitiam novas ferramentas, sem uma rodada reservada para conclusão; um argumento ou arquivo fora do catálogo encerrava toda a tarefa sem permitir que o modelo corrigisse sua seleção.

A correção mantém quatro requisições máximas e seis chamadas de ferramenta máximas. As três primeiras rodadas permitem inspeção; a quarta envia `tool_choice: "none"` e uma instrução explícita de conclusão em JSON. Se o provedor ainda devolver ferramenta na quarta rodada, o fluxo para com `PLAN_TOOL_FINAL`, sem quinta requisição.

Um caminho ou argumento inválido em ferramenta conhecida devolve somente uma mensagem fixa de correção ao modelo. O arquivo não é lido, não há acesso a `.env` ou a outro diretório, e o modelo deve escolher um arquivo do catálogo editável existente. Ferramentas desconhecidas continuam recusadas imediatamente. Os diagnósticos agora distinguem `PLAN_TOOL_SCOPE`, `PLAN_TOOL_LIMIT` e `PLAN_TOOL_FINAL`; o histórico antigo continua com seu código genérico.

Os testes com provedor simulado e PGlite descartável reproduzem três rodadas de inspeção, pedido de caminho privado bloqueado, orientação de correção, conclusão na quarta e rejeição de um provedor que ignore a proibição final. Não foram ampliados orçamento, tentativas, ferramentas ou permissões. Não houve chamada paga ou retomada da tarefa real nesta investigação. O sucesso em produção ainda depende de uma execução real autorizada após publicação aprovada.

Contrato oficial consultado: https://developers.openai.com/api/docs/guides/function-calling (`tool_choice: "none"`).

Verificação local: 220 testes aprovados, zero falhas/ignorados; typecheck, build e diff aprovados. Nenhuma migração, chamada paga ou publicação desta correção foi realizada.
