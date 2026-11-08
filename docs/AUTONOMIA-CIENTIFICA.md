# A3X Autonomia Científica v1 — integração e resultados

## Escopo e comparação

Pacote fornecido: `A3X-Autonomia-Cientifica-v1-sem-API-paga.zip`. Todos os 14 arquivos listados no manifesto conferiram em SHA-256 e tamanho antes da execução. README, protocolo, prompt, fontes e testes foram revisados. O pacote original passou em seus 10 testes e o estudo original foi executado em `.tools/`, fora do código entregue. A branch de integração é `feature/a3x-autonomia-cientifica`, baseada em `origin/main` (`9eed7a2`).

| Capacidade | Reaproveitamento / adição |
| --- | --- |
| Problemas, intenções, contexto e planos | Cognitive Engine, sem substituição do roteador do Chat |
| Memória autorizada e correções | Tabelas/rotas existentes e tela Minha memória; sem coleta de histórico para treino |
| Conhecimento e busca web | Preservados, inclusive confirmação de envio ao buscador |
| Planejar um diagnóstico offline | `research:plan` chama o planejador existente e declara ausência de execução/evidência externa |
| Testar hipótese de ajuste lexical | Estudo offline tipado em `lib/research/`; taxonomia de oito tópicos diferente das intenções operacionais do Chat |
| Aprender com erros | Gera apenas um candidato de configuração usando exclusivamente erros de treino, sem ativá-lo |
| Propor código em branch isolada | Supervisor local gera uma alteração declarativa em `config/research-policy.ts`, em outro worktree, mediante confirmação |
| Evidências no aplicativo | `/laboratorio`, com login, mostra relatório sintético versionado; não executa estudos |

Não integramos `respond/planFor` do ZIP como segundo motor de conversa. O classificador do pacote foi adaptado para avaliação offline, reutilizando a normalização básica existente; não é importado por rotas do Chat ou Programador. A política experimental não controla produção. Não houve alteração de esquema, migração ou carga de dados no PostgreSQL.

## Hipótese e método

Pergunta: corrigir vocabulário a partir dos erros de treino melhora roteamento em casos não vistos, mantendo controles? H0: não há melhora sustentada em amostra independente. H1 exige efeito replicado externamente sem regressões relevantes.

Estudo **exploratório retrospectivo**, não pré-registrado: os exemplos vieram prontos no ZIP, escritos pelo autor para demonstrar a hipótese. Treino 64, validação 24, holdout 24 e controles 13. O algoritmo sugere até três palavras por categoria, no máximo uma proposta por execução. Não altera frases, executáveis, credenciais ou limites de segurança. Nenhuma conversa de usuário foi usada.

Na integração, a seleção da proposta foi corrigida: usa somente treino, validação e controles. O holdout é avaliado depois da seleção e nunca escolhe palavras ou candidatos. O pacote original incluía não-regressão de holdout na decisão final; isso foi separado para evitar seleção indireta pelo teste. Os controles precisam passar integralmente, com verificação por caso, não só manter a contagem global. Entradas adicionais de segredo com underscore também foram protegidas no classificador offline.

## Resultados reproduzidos

| Partição | Original | Candidato | IC Wilson 95% candidato |
| --- | --- | --- | --- |
| Treino | 36/64 — 56,25% | 60/64 — 93,75% | 85,00%–97,54% |
| Validação | 3/24 — 12,50% | 21/24 — 87,50% | 69,00%–95,66% |
| Holdout | 20/24 — 83,33% | 20/24 — 83,33% | 64,15%–93,32% |
| Controles | 13/13 — 100% | 13/13 — 100% | 77,19%–100% |

Foram propostas 11 palavras. Validação: 18 casos melhoraram e nenhum regrediu; McNemar exato bilateral p ≈ 0,00000763. Holdout: zero melhorias e zero regressões; p = 1. O salto de validação é otimista porque reutiliza palavras deliberadamente presentes no treino. Seu p-valor não demonstra generalização: há seleção pelo mesmo conjunto e exemplos autorais correlacionados. Os intervalos assumem amostragem binomial independente e são apenas descritivos neste demonstrativo.

**Conclusão: nenhum ganho no holdout foi observado. H1 de ganho generalizável não foi demonstrada.** Isso também não prova ausência de qualquer efeito em outras amostras. Recomendar revisão de um candidato não aprova sua aplicação e não equivale a inteligência geral. Esses números pertencem ao classificador offline, não são a taxa de acerto do Chat.

O relatório completo com matrizes de confusão, índices de erro, previsões, intervalos, pareamento, hashes e medidas de recursos está em `research/autonomia-v1/results/demonstration.json`. Textos de erro não são repetidos nos logs; o benchmark fornecido é sintético e versionado. Tempos e consumo variam entre execuções; `cpuMs` mede atividade do processo Node durante o estudo, incluindo possíveis threads do carregador, não um orçamento de CPU de sistema operacional.

## Execução e governança

```powershell
npm run research:plan -- "Investigar falha do site Railway"
npm run research:study
# Opcional: só após revisar artefatos, registrar a integração e manter branch feature limpa:
npm run research:branch -- --confirm-create-branch
```

`study` usa somente benchmark e política versionados. O worker tem ambiente sem variáveis herdadas de credenciais, até 256 MiB de heap V8, 32 MiB de geração jovem, stack de 4 MiB e término após dez segundos de tempo de parede. O cálculo também verifica deadline. Limites de entrada: 256 casos por partição, 512 no total, mensagens de 4.000 caracteres (5.000 nos controles), vocabulário limitado, uma proposta. Não aceita caminho para código ou dataset externo. CPU é limitada indiretamente pelo trabalho e tempo, não por cgroup. Limite de heap não inclui toda memória nativa/RSS. Worker não é sandbox para código hostil: só carrega código confiável e fixo do repositório.

Artefatos ficam em `.tools/research-results/`: relatório, política candidata, manifesto e diff. Nada é aplicado. O supervisor é separado e só aceita `--confirm-create-branch`. Exige branch feature limpa, remoto exato autorizado, hashes compatíveis com a baseline e um destino novo. Desativa hooks e fsmonitor Git. Revalida o candidato, ignorando qualquer patch externo. Só cria uma branch `proposal/a3x-research-<hash>` e worktree local, e escreve o literal de política no caminho fixo. Não usa shell construído a partir de texto, não executa o candidato, não faz commits, não publica nem toca a branch original. O processo do estudo não tem essa capacidade Git.

O diff é **código declarativo de configuração TypeScript**, não reescrita livre do programa. Mensagens, páginas web e benchmarks são dados, nunca instruções administrativas. Qualquer evolução além do escopo de tokens exige implementação humana separada. Uma publicação futura do candidato exige nova revisão, testes independentes e aprovação humana específica; a autorização para publicar esta integração não aprova o candidato experimental.

## Validação e preservação

Testes automatizados cobrem manifesto, repetibilidade, ausência de mutação da baseline, separação de holdout, falha de controles, entradas inválidas, deadline, limites de proposta, segredos, patch de caminho único, recusa de opções de publicação e autenticação/leitura do painel. A suíte existente continua validando memória, conhecimento, Chat, Programador, histórico e isolamento no PostgreSQL descartável. A verificação final executa `npm test`, `npm run typecheck`, `npm run build` e `git diff --check`; números finais e estado do deploy são informados na entrega.

## O que falta para um modelo aberto

Esta integração não instala modelo nem baixa pesos. Para linguagem e código de propósito geral faltam: selecionar modelo e licença compatíveis; obter pesos/tokenizador e formato de conversa; configurar um runtime de inferência local/privado; dimensionar RAM/VRAM, quantização, contexto, concorrência e latência; impor cotas e orçamento de infraestrutura; integrar o backend sem expor dados a terceiros; testar recusa, alucinações, fontes, privacidade e instruções maliciosas em amostras independentes.

Gerar patches arbitrários exigiria ainda isolamento real de sistema operacional, permissões mínimas, lista de ferramentas permitidas, auditoria, bloqueio de rede/segredos e revisão humana antes de qualquer execução ou publicação. Não habilitamos isso com um worker Node. Sem API paga de IA não significa infraestrutura gratuita: Railway, banco, computação, energia e armazenamento podem gerar custos.

Para alegação científica: coletar com consentimento centenas de exemplos externos anonimizados, rotulação cega, protocolo pré-registrado, baselines simples, análise de falsos positivos, replicações e custos completos. Os 13 controles sintéticos não certificam toda a segurança do aplicativo.
