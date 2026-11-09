# GPT-6 Luna opcional

Autorizado pelo responsável em 09/11/2026, com orçamento solicitado de US$5 por mês. `OPENAI_API_KEY` fica exclusivamente nas variáveis secretas do serviço Railway, nunca em `NEXT_PUBLIC_*`, no navegador, no banco ou no Git. Nenhum valor real foi lido durante a implementação.

Depois de entrar no Chat, selecione **GPT-6 Luna** e confirme o envio de contexto. A presença da chave não troca o provedor das contas existentes: o padrão continua **Meu computador**. A escolha e o consentimento são privados por conta. Para desativar globalmente: `OPENAI_ENABLED=0`. O modelo é fixo `gpt-6-luna`, via Responses API, sem ferramentas pagas, sem execução de código e sem repetição automática de chamadas.

## Custos

`OPENAI_MONTHLY_BUDGET_USD=5` é o teto interno global do aplicativo por mês UTC, compartilhado pelas contas. O servidor reserva orçamento sob bloqueio transacional antes de chamar a API. Limite de 600 tokens de saída, contexto limitado e duas chamadas simultâneas por conta. Respostas conhecidas ajustam a reserva ao consumo; falhas ambíguas conservam a reserva. Não há cota diária de perguntas no modo local.

Estimativas usam a tarifa padrão curta documentada em 09/11/2026: US$0,10 por milhão de tokens de entrada e US$0,50 de saída. Descontos de cache são ignorados por conservadorismo. O teto não controla outras aplicações usando a mesma chave, alterações de preço, impostos, câmbio ou custos do Railway. Configure também os controles do projeto na OpenAI; este mecanismo não é garantia da fatura total. Reconciliar manualmente reservas desconhecidas exige revisão de consumo no provedor; não há limpeza automática que possa liberar orçamento já utilizado.

## Privacidade e comportamento

Após consentimento, são enviados mensagem atual, histórico recente limitado, memórias aprovadas e referências necessárias da conta. A autorização de acesso continua no servidor. Respostas históricas identificadas como documentais locais são excluídas do contexto nuvem. Os arquivos privados do inventário guardados no PC não são lidos nem enviados automaticamente. Qualquer texto que o usuário digitar ou colar nas mensagens participa do contexto enviado.

`store:false` desativa armazenamento da resposta como recurso recuperável da API; não promete retenção zero pelo provedor. A aplicação mantém seu próprio histórico privado. O modelo não navega sozinho: a pesquisa web existente continua exigindo confirmação. Programador, login, memória e sessões mantêm seus fluxos. O transporte SSE existente mantém heartbeat e entrega a resposta final validada; esta versão não apresenta tokens da OpenAI progressivamente.

O banco recebe apenas preferências e registros de tokens/custo/estado, sem conteúdo das mensagens ou chave no ledger. A migração incremental `010_openai_luna.sql` é aditiva e idempotente; validar em banco descartável antes de publicar. O Railway aplica migrações pelo comando existente de pré-deploy.

401, falta de acesso ao modelo, saldo insuficiente, limites, timeout, resposta incompleta ou inválida são apresentados como erros, sem revelar o corpo do provedor. Não há troca silenciosa para outro modelo cobrado. Uma chave cadastrada pode ainda não ter crédito ou acesso ao modelo; uma conversa real autenticada é necessária para confirmar isso.

Referências: [modelo e preços](https://developers.openai.com/api/docs/models/gpt-6-luna), [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses).

## Validação em 09/11/2026

- `npm test`: 164 testes aprovados. Inclui migração 010 aplicada duas vezes em PGlite descartável, consentimento, isolamento, orçamento, falhas da API, interface e Chat com SSE e persistência sem ponte local.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado, incluindo preparação standalone.
- `git diff --check`: aprovado.
- Chamadas OpenAI simuladas nos testes, sem consumo de API. A chave real do Railway, o crédito e a permissão do modelo não foram verificados por uma conversa autenticada. Nenhum teste de migração foi executado no banco de produção.
