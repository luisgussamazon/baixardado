# Acionamento imediato de engenharia

A fila original era consultada pelo workflow `a3x-engineering.yml` a cada 15 minutos. Criar uma tarefa não enviava um evento ao GitHub. O agendamento permanece como recuperação; criar ou retomar agora solicita `workflow_dispatch` depois de confirmar a transação no banco. Tarefas já na fila têm **Executar agora**.

## Configuração única no Railway

O responsável autorizou em 14/11/2026 uma credencial exclusiva no cofre do Railway, limitada a Actions neste repositório. Crie um personal access token **fine-grained**, selecione somente `luisgussamazon/baixardado`, com **Actions: Read and write** e prazo de expiração. Não conceda escrita de Contents, Administration ou acesso a outros repositórios.

Cadastre-o diretamente como `A3X_GITHUB_ACTIONS_TOKEN` nas Variables do serviço A3X (`baixardado`) no Railway. Não envie o valor no Chat, não grave no computador ou `.env` e não use prefixo `NEXT_PUBLIC_`. A autorização para este segredo não abrange outros segredos. Nenhum token é incluído nos testes, na extensão, no modelo, na resposta da API ou nos logs. O servidor só informa se está configurado.

O endpoint é fixo no GitHub, workflow fixo `a3x-engineering.yml`, referência fixa `main`. A chamada envia somente `{"ref":"main"}`, sem objetivo, arquivos ou identidade do usuário. A identidade temporária OIDC do runner e seus controles continuam iguais. Documentação do endpoint e permissões: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event.

## Garantias e limites

- Exige sessão, origem válida, consentimento existente e tarefa pertencente ao usuário. Só tarefas em estado `queued` podem solicitar início.
- O registro da tarefa é confirmado antes do acionamento. Falha no GitHub não perde a tarefa nem informa falsamente que está executando.
- Uma tentativa por tarefa por minuto, serializada pelo bloqueio da linha. Timeout de oito segundos e nenhuma repetição automática de POST incerto. Respostas brutas do provedor são omitidas.
- Não mantém conexão ou transação do PostgreSQL durante a chamada HTTP. Não modifica SQL, cron, concorrência, permissões do workflow, orçamento da OpenAI ou limites de tarefas.
- “Acionado” significa solicitação aceita pelo GitHub, não início nem conclusão. Runner ocupado, limites do GitHub, indisponibilidade ou tarefa anterior podem causar espera. A fila continua serializada e pode atender uma tarefa mais antiga primeiro.
- Sem credencial, o painel explica o agendamento e oferece o caminho manual: abrir o workflow, **Run workflow**, branch **main**. Cadastrar a variável não despacha automaticamente tarefas antigas: use **Executar agora** após ativar a nova versão.

Testes automatizados não criam workflows reais nem consomem API paga. A ativação real depende da credencial cadastrada no serviço e da publicação aprovada desta mudança.

Validação local em 14/11/2026: 219 testes aprovados, zero falhas/ignorados, typecheck e build aprovados, diff sem erros. Não houve mudança de esquema nem testes em banco de produção. Em ação separada e autorizada, o job público do runner da versão já publicada foi reacionado: assumiu trabalho e entrou na etapa de engenharia, mas terminou interrompido sem causa detalhada no log sanitizado. Isso não comprova sucesso da tarefa e não provocou repetição automática ou publicação de proposta.
