# A3X Autonomia Científica v1 — experimento offline sem API paga

Este pacote é um **protótipo experimental**, não uma inteligência artificial ilimitada, consciente, generativa ou capaz de se reconstruir livremente. Ele é um módulo independente destinado à **integração supervisionada** no A3X AI já existente (`luisgussamazon/baixardado`). **Não substitui o projeto nem altera seu Railway.**

## O que funciona de verdade

- `src/engine.mjs`: interpreta e classifica solicitações em 8 categorias, usa contexto de uma conversa e devolve passos limitados para um problema conhecido.
- `src/experiment.mjs`: compara respostas com 64 exemplos de treino, 24 de validação, 24 de teste separado (*holdout*) e 13 controles de regressão e segurança. Conta acertos e erros.
- Identifica palavras ausentes no vocabulário a partir **apenas do treino** e gera `results/proposal-policy.json`.
- Mede o efeito da mudança na validação e no holdout, preservando o conjunto de teste fora da geração.
- **Não aplica a proposta à política ativa.** A mudança exige revisão humana, testes completos e autorização.
- Não chama redes, APIs, modelos, GitHub, Railway, shell nem outros serviços. Não lê credenciais. Não executa o texto informado pelo usuário.

## Como usar no Windows 11 / VS Code

Não é necessário extrair manualmente: anexe o ZIP no Codex, se o Codex aceitar o arquivo, e peça que extraia em pasta temporária fora do repositório. Se ele não aceitar anexos, basta colocar o ZIP no computador e indicar seu caminho ao Codex.

Node.js 22 ou superior:

```powershell
cd C:\projetos\A3X-Autonomia-Cientifica-v1
npm test
npm run demo
npm run study
node src/cli.mjs solve "Meu site no Railway não responde"
```

O comando `study` cria apenas `results/report.json` e `results/proposal-policy.json` na pasta do pacote. Nenhum comando altera o banco, o código-fonte do A3X ou a produção.

## Integração ao A3X AI

**Não faça uma instalação cega de todos os ZIPs anteriores.** O GitHub atual já contém módulos de diálogo, memória e conhecimento. Peça ao Codex que crie `feature/a3x-autonomia-cientifica`, compare com `lib/local-conversation.ts`, `lib/dialogue-knowledge.ts`, `lib/knowledge-search.ts` e `app/api/chat/route.ts`, e **reaproveite** módulos compatíveis.

Arquitetura proposta:

`Usuário → autenticação/cota existentes → interpretador de intenções → contexto da conversa → base de conhecimento → plano declarativo → resposta`.

Separadamente, fora do caminho de produção:

`Dados de testes → avaliação → proposta de melhoria da política → testes de regressão → revisão humana → PR → deploy autorizado`.

Não ligar o `study` a uma rota pública. Não permitir que o processo altere diretamente o `main`, crie commits, manipule credenciais, execute código não confiável ou publique. Preservar sessões e isolamento entre usuários no PostgreSQL. Se desejar gerar patches de código como etapa futura, usar um agente de programação isolado que **somente proponha PRs** e aguarde revisão/aprovação humana, com testes independentes.

## Resultado atual do experimento ilustrativo

Os dados foram escritos especificamente para demonstrar uma hipótese. O comando `npm run study` mede a diferença real neste conjunto **sintético**. Melhoria de validação não demonstra ganho em conversas gerais, e o holdout é a medida separada que precisa ser destacada. Para alegações científicas, use amostra independente, rotulação cega, taxas de falha, intervalos de confiança e replicação.

## Limitações e custos

- Ações são **planejamentos textuais**, não execução autônoma de tarefas externas.
- A autoalteração é apenas **evolução de configuração**, não reescrita do próprio código ou treinamento de pesos de IA.
- A linguagem permanece limitada a regras. Para geração geral de texto e código é necessário um **modelo de linguagem** e hardware/inferência, mesmo que o modelo tenha pesos abertos e não utilize API paga.
- Custo da **API de IA**: R$ 0. Energia elétrica, computação, hospedagem Railway, banco e serviços públicos podem gerar despesas. Não existe capacidade realmente ilimitada.

Leia `docs/PROTOCOLO-CIENTIFICO.md` e `PROMPT-CODEX.txt`.
