# Autonomia contínua A3X

O responsável autorizou em 09/11/2026: **publicar automaticamente após testes e verificações, mantendo credenciais, autenticação e banco protegidos**. O fluxo anterior de baixar JSON e aplicar manualmente foi substituído. A identidade institucional A3X TECH, fundada por Luis Gustavo e Samuel Moraes, permanece e não concede privilégios a contas do aplicativo.

## Ciclo real

O workflow `.github/workflows/a3x-autonomy.yml` executa diariamente às 03:17 UTC (00:17 em São Paulo), na `main` do repositório autorizado. A instalação/alteração desse workflow na main inicia um ciclo de ativação; o mantenedor também pode usar **Run workflow**, modo `enable`, `run` ou `pause`. Não depende de PC ligado, credencial local persistente, download de proposta ou confirmação por melhoria.

1. Aguarda o novo endpoint no Railway.
2. Autentica o job por JWT OIDC assinado pelo GitHub. O servidor verifica assinatura RS256, emissor, audiência, expiração, IDs imutáveis do dono/repositório, subject, branch main, workflow exato, evento permitido e runner hospedado. Nenhum token GitHub ou chave OpenAI precisa ser cadastrado no outro serviço.
3. O modelo consulta o catálogo público do build, escolhe até três fontes e um objetivo pequeno e gera substituições exatas. O catálogo inteiro pode ser explorado por seleção de arquivos; não é acesso ao disco, credenciais ou dados privados. Contexto e escrita têm limites explícitos.
4. A saída passa pela política de caminhos, tamanho, conteúdo e contexto único. Sem melhoria evidente, registra `no_change`, sem inventar uma alteração.
5. O runner aplica a proposta em branch/worktree com hash exato, sem executar o código nessa etapa.
6. Copia a proposta para um ambiente Docker isolado. Fontes e dependências são somente leitura; `.git`, `.env*`, áreas de credenciais e ferramentas locais não são copiadas. Sem rede, tokens, banco real, capacidades Linux ou Docker socket. Contêiner não privilegiado, usuário sem root, limites de CPU/memória/processos/tempo.
7. Testes, typecheck sem cache incremental e build rodam em contêineres separados com artefatos novos. A IA não pode reescrever testes, scripts ou pacote para forjar a verificação. Logs brutos de testes não viram comandos do workflow.
8. Só após sucesso, confirma que o ciclo continua autorizado, que main não mudou e que os hashes dos arquivos testados continuam iguais. Publica branch auditável e commit em main via API GitHub, sem `force`. Respeita proteções do repositório; não as contorna. A autorização expressa do mantenedor substitui a aprovação humana por alteração nesse escopo.
9. Aguarda o status do Railway para o SHA publicado. Só registra `deployed` após sucesso do provedor. Se não confirmar ou houver falha após a proposta, pausa a autonomia para não acumular problemas. Um commit já publicado não é revertido automaticamente; a versão anterior pode continuar servindo pelo mecanismo do Railway. Consulte o workflow e o commit antes de reativar.

## Acesso e proteção

O agente lê somente fontes públicos versionados no catálogo. A escrita está limitada a `WRITABLE_SOURCE`: textos da apresentação do Chat e dos modos, estilos, personalidade, tokenização da pesquisa, classificação experimental e árvore de projetos. No Chat e seletor de modos, a estrutura AST e a lógica são comparadas e precisam permanecer iguais; só textos de apresentação podem mudar. Nos auxiliares não são aceitas novas importações, globais ou efeitos externos. CSS não pode adicionar carregamentos. **Não é acesso irrestrito ao servidor.** Autenticação, APIs, banco/SQL, renderização de conteúdo não confiável, chaves, dependências, testes, scripts, políticas, workflow e publicação são protegidos contra escrita pelo modelo. Ampliar essa lista exige manutenção explícita do mecanismo; o modelo não pode remover suas próprias restrições. Os filtros e testes não provam ausência de erros ou de riscos semânticos.

O `GITHUB_TOKEN` temporário permanece no host confiável, com escopos de conteúdo/publicação, OIDC e leitura de deployments. O código proposto só é executado em contêiner, que não recebe esse token, credenciais do Railway, chave OpenAI ou dados de usuários. O endpoint aceita somente o workflow confiável da main, não sessões comuns, nome de fundador, PRs, forks ou tokens de outros repositórios. Identificadores de execução e hashes de JTI impedem repetição do ciclo. Não se armazenam JWTs brutos.

O primeiro usuário criado no app é usado somente para atribuir consumo no ledger existente; o ciclo não lê sua memória, mensagens ou documentos. Não cria papel administrativo nessa conta. Histórico de ciclos contém apenas objetivo/resumo de código público e links de execução/commit. A migração `013_autonomy_cycles.sql` é aditiva e testada em PostgreSQL descartável.

## Pausa, custos e limites

- Painel `/autonomia` mostra o estado real, com login. Não é um formulário de propostas.
- Para parar: workflow manual com modo `pause`, desativar o workflow no GitHub ou configurar `A3X_AUTONOMY_ENABLED=0` no Railway. Desativar OpenAI também impede inferência. Sessões comuns do aplicativo não ativam nem pausam o publicador.
- Um agendamento diário, no máximo três tentativas em 24 horas e um ciclo ativo. Sem retries automáticos de geração. O teto interno global de US$5/mês é compartilhado com Chat e desenvolvimento; reserva conservadora continua no mesmo ledger. Não controla outras aplicações nem toda a fatura da OpenAI.
- GitHub Actions, Docker e Railway têm disponibilidade, cotas e eventuais cobranças próprias. Não há promessa de internet, computação ou IA ilimitadas. O cron pode atrasar e o GitHub pode suspender agendamentos conforme regras da conta/repositório.
- `GITHUB_TOKEN` não inicia automaticamente outro workflow Actions por push; a validação completa já aconteceu dentro do ciclo. A integração GitHub/Railway precisa aceitar o commit do bot; se não ocorrer deploy, o ciclo não declara sucesso e pausa.
- O ciclo não treina pesos, não é consciente, não corrige qualquer problema sozinho e pode não encontrar mudança útil. Alterações grandes, backend, login, dados e novo comportamento sensível continuam fora do escopo autônomo.

## Verificação

Testes automatizados cobrem assinatura/claims OIDC, replay, limites, pausas, proteção de caminhos/hashes, publicação sem force e verificação de deployment com fixtures. A CI acrescenta um job Linux/Docker para executar toda a suíte, typecheck e build sem rede ou segredos. Testes locais Windows não substituem esse job. A ativação só pode ser afirmada após uma execução real autenticada do workflow.

Validação local desta implementação: suíte com 194 testes aprovada, mais dois testes de proteção AST/efeitos externos aprovados; typecheck, build standalone e diff check aprovados. Migração 013 aplicada duas vezes em PGlite descartável. Publicação nos testes é simulada; nenhum código proposto foi publicado por esses testes. O job Docker e o primeiro ciclo real precisam ser confirmados no GitHub antes de declarar a autonomia ativada.

Referências: [OIDC GitHub](https://docs.github.com/en/actions/reference/security/oidc), [GITHUB_TOKEN](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), [eventos e recursão de workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
