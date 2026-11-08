# A3X AI — Diálogo contextual e ensino privado

## Como funciona a prioridade de respostas

1. O código atual valida sessão, origem, limite diário e registra a pergunta.
2. `converse()` mantém os recursos existentes: nomes no contexto, cumprimentos, contas, pedido explícito de pesquisa, fluxo de plano e respostas de segurança.
3. O motor `answerWithDialogueCards()` reconhece até 55 assuntos baseados em perguntas já feitas pelo proprietário, sem Internet e sem IA externa. Perguntas breves como “como faço?” usam o último cartão respondido na mesma conversa.
4. Se a mensagem for candidata a recuperação, `findKnowledgeForChat()` consulta a biblioteca global e os registros do usuário **autenticado**. Um match forte retorna a resposta ensinada, com fonte.
5. Sem correspondência forte, mantém a resposta local existente, inclusive a oferta de pesquisar. Pedidos explícitos “pesquise...” continuam acionando o buscador.
6. O Chat atual salva toda resposta no histórico e envia dados via SSE, sem alterações no contrato de mensagens.

## Ensino: exemplo

Na tela `/ensinar` (somente após login), crie:

- Tema: `Processos`
- Título: `Fluxo de cadastro de fornecedor`
- Pergunta: `Como cadastrar um novo fornecedor no sistema?`
- Resposta: `Abra Cadastros > Fornecedores, preencha os campos obrigatórios, verifique os dados e salve. Confirme a criação consultando a lista.`
- Palavras-chave: `fornecedor, cadastro, sistema`

A resposta é **exemplo fictício de conteúdo**: substitua por seu procedimento verdadeiro. O projeto não deve presumir que essa tela exista em sistemas reais.

## Variações de conversa

- “Quero usar sem pagar OpenAI.” → diferença entre API e hospedagem.
- “Como faço um PR?” → base/compare e revisão.
- “Como faço?” após a explicação → detalhes correspondentes ao assunto anterior.
- “Preciso corrigir uma resposta.” → orientar a edição na aba Ensinar.
- “Me mostre minha senha.” → **nunca** buscar ou expor segredos.
- “Pesquise como funciona TypeScript.” → encaminha à busca externa atual, com fontes.

## Proteção do conteúdo e dados

- Conteúdo público/geral: IDs `a3x:...`, `owner_user_id IS NULL`.
- Conteúdo privado: IDs `user:<uuid>`, `owner_user_id` sempre obtido da **sessão no servidor**, nunca passado pelo cliente.
- Limite de 150 registros por usuário, 4.000 caracteres de resposta, validação de URL HTTPS, lista de palavras-chave e serialização transacional de inclusão.
- Todas as rotas de escrita exigem mesmo Origin e sessão autenticada.
- A busca tem limiar lexical mínimo e evita falsas respostas. Em casos ambíguos, usa fallback em vez de fingir certeza.
- Dados aprendidos podem estar incorretos; o usuário deve revisá-los. A recuperação não deve executar código contido nos registros.

## Limitações técnicas

- Não há processamento neural nem auto-treinamento. Uma explicação cadastrada é recuperada, não inventada.
- Similaridade é lexical com sinônimos redigidos manualmente; variações muito distantes podem não combinar. Embeddings seriam uma evolução, não pressuposta.
- O contexto considera até 24 mensagens anteriores apenas para continuidade de cartões. Sem agendador, não inicia mensagens proativamente.
- A primeira versão não lê PDFs, Excel, páginas inteiras da web nem gera novos arquivos de sistema por inferência.
- As rotas de conhecimento dependem da migração 003 e de PostgreSQL funcional.

## Homologação antes do Railway

1. Em branch nova, confirme as três modificações em `lib/local-conversation.ts`, `app/api/chat/route.ts`, `components/mode-switch.tsx`.
2. Teste `npm test`, `npm run typecheck`, `npm run build`.
3. Teste a migração 003 em PostgreSQL descartável. Execute os dois importadores em dry-run.
4. Após autorização e backup, valide CRUD na tela Ensinar e isolamento entre duas contas.
5. Teste regressão do Chat (cálculo, nome, histórico, pesquisa web e cancelamento), Programador (ZIP, limites e acesso).
6. Só depois abra PR, aprove e publique. Observe métricas e logs do Railway.
