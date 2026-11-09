# Autonomia controlada

## Chat e estudo público

O Chat deixou de consumir a cota diária. Login, isolamento por usuário, bloqueio de conversas simultâneas, fila do modelo, tamanho de entrada e timeout permanecem. Projetos usam `DAILY_PROJECT_LIMIT` (padrão 50; `DAILY_MESSAGE_LIMIT` é somente fallback legado de projetos). Contadores históricos não são apagados.

A migração incremental 008 adiciona três tabelas sem alterar dados privados. Um computador autorizado que consulta a fila dispara, no máximo, um ciclo global a cada 24 horas. São três consultas fixas sobre programação/sistemas, logística/planejamento e inventário/estoque, com até três fontes por assunto. Nenhuma mensagem, memória, nome ou credencial entra nessas consultas. O buscador recebe apenas os assuntos públicos fixos. `A3X_AUTO_STUDY=0` desativa a coleta.

`/estudos` exige login e mostra as referências públicas, compartilhadas e não revisadas. O Chat pode fornecer esses trechos ao modelo com identificação de origem. Isso é recuperação de informação: não atualiza pesos, não garante veracidade, não acessa páginas arbitrárias e não comprova aprendizagem. Falhas não geram tentativas contínuas. O computador precisa continuar conectado.

## Agente local de código

Com o checkout limpo, Ollama em localhost e o modelo já autorizado:

```powershell
npm run agent:develop -- --goal "Criar função pura de ponto de reposição"
# Opcional: repetir um ciclo a cada 24 horas, enquanto este processo estiver aberto:
npm run agent:develop -- --watch
```

O agente pode escrever autonomamente um ou dois arquivos TypeScript, até 16 KB, exclusivamente em `lib/experiments/*.ts`, numa branch `agent/a3x-*` e worktree em `.tools/code-agent/review/`. Não precisa aprovar cada escrita nessa área experimental. Não modifica a branch de trabalho, autenticação, banco, configuração, dependências ou produção. Não lê histórico, arquivos de ambiente ou código privado para enviar ao modelo. Objetivo informado vai somente ao Ollama local.

Só há verificação estática de sintaxe e de operações proibidas. Arquivos gerados não são importados ou executados, inclusive testes. O filtro estático **não é sandbox nem prova de segurança**. Revisão humana e sandbox independente são necessárias antes de executar. Não há commit, push, merge ou deploy automático das propostas. A conversa web não invoca Git nem shell. Não é um desenvolvedor autônomo geral nem um sistema consciente.

## Verificação

Testes novos cobrem caminhos, nomes reservados no Windows, efeitos externos, duplicação, limites de conteúdo, migração 008 idempotente em PostgreSQL descartável PGlite, coleta fixa, referências não revisadas, falhas e intervalo entre ciclos. Testes existentes verificam que a cota de projetos não bloqueia o Chat.

Validação local em 08/11/2026: `npm test` **129/129**, `npm run typecheck` aprovado e `npm run build` aprovado, incluindo standalone. `git diff --check` aprovado. A migração foi exercitada somente no banco descartável; o deploy autorizado executa o migrador incremental padrão. PGlite não substitui teste de carga, concorrência e operação prolongada no PostgreSQL do Railway. Não houve execução de código gerado nem avaliação científica de ganho de aprendizagem nesta entrega.
