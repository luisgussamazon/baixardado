# Conversa local por intenções e contexto

Implementação na branch `feature/conversa-local`. O problema anterior era encaminhar toda frase ao buscador: “fala comigo” acabava sendo interpretado como título de filme. Agora o Chat primeiro consulta um motor local e só acessa a rede quando existe pedido de pesquisa.

## Mecanismo

`lib/local-conversation.ts` implementa reconhecimento de intenções, extração de nome, composição de respostas com slots e alguns passos de diálogo. Usa até 24 mensagens recentes da conversa, carregadas sob o proprietário da sessão em `app/api/chat/route.ts`. Não há estado global, API de IA, treinamento ou modelo baixado.

Funções implementadas: saudações, apresentação de nome, consulta do nome recente, parar de usar o nome, despedida, ajuda, relato do dia, interesses, planejamento inicial por etapas e aritmética com precedência. Aritmética usa parser limitado, sem eval/Function. Outras solicitações recebem uma pergunta de esclarecimento ou oferta de pesquisa, sem fingir uma resposta conhecida.

Escreva `pesquise` seguido do assunto para acessar a busca. Uma resposta curta “sim” só confirma pesquisa quando a última mensagem do assistente termina com a oferta correspondente. Mensagens locais não são enviadas aos buscadores. O Programador mantém pesquisa e templates; não passa a gerar sistemas completos.

## Exemplos

1. “Fala comigo” → saudação e pergunta para continuar, sem rede.
2. “Meu nome é Ana” e “qual meu nome?” → usa o nome informado nessa conversa.
3. “Quero aprender programação” e “do zero” → organiza o primeiro passo e pergunta sobre resultado e tempo.
4. “Quanto é (2+3)*4?” → calcula 20, sem execução de código.
5. “Pesquise TypeScript” → busca externa com fontes.

## Privacidade e limites

O histórico continua persistido no PostgreSQL. Pedir “esqueça meu nome” impede o uso posterior do nome dentro do contexto recente; **não apaga a mensagem original**. Excluir a conversa remove seus registros conforme o fluxo já existente. O nome pode sair do contexto após 24 mensagens; não é memória permanente de perfil.

O motor é determinístico e baseado em regras. Não possui a compreensão, criatividade ou abrangência de um modelo de linguagem, consciência ou sentimentos. Não promete aprender sozinho ou entender qualquer assunto. As respostas podem ser repetitivas e intenções não previstas recebem esclarecimento. Nenhuma característica inédita no mercado é alegada.

Autenticação, autorização, cota diária, bloqueio da conversa, SSE, cancelamento e limites existentes permanecem. Os testes cobrem comportamento e isolamento real em PGlite, sem contas ou mensagens fictícias em produção. Resultados finais de testes/build são informados na entrega. A versão online não é alterada sem publicação autorizada desta branch.

Verificação local anterior à publicação: **38 testes aprovados**, `npm run typecheck` e `npm run build` aprovados, incluindo preparação do standalone. `git diff --check` aprovado. A publicação autorizada e seu resultado ficam registrados no PR do GitHub e nos estados de implantação do Railway.
