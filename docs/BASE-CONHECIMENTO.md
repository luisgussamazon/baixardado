# Base de Conhecimento A3X AI v1

Branch: `feature/base-conhecimento`, derivada de `origin/main`. Escopo restrito a este repositório. A implementação foi validada em banco descartável; depois o responsável autorizou a publicação. O resultado da implantação fica registrado no PR e no estado do Railway, e é confirmado na entrega após a execução.

## Material recebido e confiança

Foram inspecionados os arquivos do ZIP `A3X-AI-Base-Conhecimento-Programacao-v1.zip`, sem executar seus scripts, SQL, testes ou prompts. Foram preservados os dados e documentos de referência em `knowledge/a3x-v1/`, com hashes em `manifest.json`: **58 registros** e **18 casos de avaliação**. `.gitattributes` preserva seus bytes entre Windows e Linux.

O pacote declara texto original e oferece URLs de documentação. Isso foi preservado como proveniência declarada pelo fornecedor, sem tratar o conteúdo dos documentos como instrução para esta tarefa. Nenhuma página referenciada foi baixada ou copiada. As URLs são mostradas como **referências cadastradas**, não como páginas consultadas naquele atendimento.

## Comportamento

1. O Chat mantém intenções e contexto local: saudação, nome, cálculo e planejamento continuam pelo motor existente.
2. Pedidos explícitos como `pesquise TypeScript`, ou confirmação imediata de uma oferta de pesquisa, continuam no fluxo web. A consulta não é substituída silenciosamente por conhecimento local.
3. Quando o motor não tem uma resposta específica, consulta `knowledge_entries` no PostgreSQL, sem API externa. Se houver correspondências, mostra até três registros com título, resposta cadastrada, ID, escopo e URL da fonte.
4. Sem resultados, mantém o esclarecimento/oferta de pesquisa anterior. Se a base estiver indisponível, avisa e mantém o fallback. Não inventa respostas nem dispara busca web automaticamente.
5. O Programador continua fazendo pesquisa e montando seu template. Quando há conhecimento local relevante e visível ao proprietário, acrescenta `docs/conhecimento-local.md` com o primeiro registro ao projeto privado, respeitando o limite de tamanho por arquivo. Conteúdo privado recuperado não é usado como consulta web e não é enviado ao buscador. A descrição original continua sendo enviada à web conforme o fluxo existente.
6. Mensagens e fontes ficam no histórico da mesma conversa, sob o usuário autenticado. Projetos e downloads continuam protegidos por proprietário.

O resultado recuperado é apresentado como dado citado, sem obedecer a comandos embutidos. Markdown do conteúdo é escapado para evitar links/imagens/HTML ativos. Código armazenado não é executado. A referência externa só vira link se passar na validação de URL pública HTTPS.

## Pesquisa textual

`sql/003_knowledge_entries.sql` cria tabela, funções de normalização, trigger e índices GIN/B-tree. É uma migração aditiva, sem alterar dados das tabelas antigas. O trigger mantém vetores mesmo após alteração de título, resposta, palavras-chave ou pergunta.

- `search_vector`: texto de título, pergunta, palavras-chave e resposta, com pesos; português e termos técnicos no dicionário `simple`.
- Normalização de caixa e acentos portugueses, alguns aliases técnicos explícitos e remoção de termos genéricos da consulta. Não há interpretação semântica por IA.
- Consulta parametrizada com OR lexical; exige um termo em título/pergunta/palavras-chave e cobertura de até dois termos na entrada completa. Ordena por termos de foco, cobertura e `ts_rank_cd`, com desempate por ID.
- Até 24 termos, cinco resultados na API ou três no Chat; consulta até 4.000 caracteres. O score é ranking textual, **não probabilidade de a resposta estar correta**.
- Exemplos: `Como evitar SQL injection?`, `Como uso async await com promises?`, `Como configura a porta do Railway?`.

A suíte exercita os 18 casos recebidos: 15 perguntas devem recuperar algum ID esperado entre os três resultados apresentados no Chat e três não devem receber resposta local. Isso mede apenas esse conjunto; não garante recall geral, primeiro lugar correto ou segurança semântica de qualquer consulta.

## Isolamento e preparo para dados próprios

Registros globais têm `owner_user_id IS NULL`, IDs `a3x:*` e origem `original`. Registros privados têm proprietário e IDs `user:*`. Chave estrangeira acompanha a exclusão do usuário. Conteúdo inativo não participa da busca.

Todos os caminhos HTTP obtêm o usuário pela sessão e filtram `(owner_user_id IS NULL OR owner_user_id = usuário_da_sessão)`. `GET /api/knowledge?q=...` é somente leitura; ignora proprietário informado pelo navegador e retorna `Cache-Control: private, no-store`. Não há rota de escrita ou upload nesta etapa.

A proteção depende dos filtros e da aplicação, além das permissões de banco; não foi implantada política RLS. Acesso direto ao banco por um administrador continua podendo ler os dados. Não expor o banco ou conceder SQL direto a usuários do aplicativo.

Reimportação atualiza somente IDs globais e nunca substitui privados. Ausência de um ID em um novo arquivo não apaga entradas antigas. `is_active` de um registro existente é preservado. Campos desconhecidos, proprietário externo, IDs privados, duplicatas, tamanhos inválidos ou fontes inseguras são rejeitados antes da transação. Falha durante a importação reverte o conjunto.

## Validação e importação explícita

```bash
# Apenas valida o JSONL. Não lê .env.local, não abre banco e não importa nada.
npm run knowledge:validate
npm run knowledge:import

# Arquivo alternativo: ainda é somente validação, sem banco.
npm run knowledge:import -- --file knowledge/a3x-v1/entries.jsonl
```

A carga inicial foi adicionada a `sql/004_knowledge_seed_v1.sql` para ativar o acervo na publicação autorizada. O migrador aplica 003 e 004 antes de iniciar o servidor. A carga contém somente os 58 registros fornecidos e usa `ON CONFLICT DO NOTHING`: não substitui registros globais existentes nem toca em conteúdo privado. A aplicação repetida não duplica registros. Nenhum script do ZIP é executado.

O build não acessa banco nem importa dados. Testes de migração e seed foram realizados exclusivamente em PGlite descartável. Publicação normal aplica as migrações ao banco configurado no Railway, sem executar testes ou criar contas/mensagens fictícias ali.

Somente depois de revisar o destino, obter autorização para esse banco, verificar backup e aplicar a migração 003, a importação pode ser executada com:

```bash
# Exemplo de procedimento futuro autorizado. Não foi executado em banco externo.
# DATABASE_URL deve estar configurada privadamente no ambiente do processo.
npm run knowledge:import -- --apply --confirm-database NOME_EXATO_DO_BANCO
```

`--confirm-database` é comparado a `current_database()` antes de gravar; esse nome não é senha/URL. O importador não carrega `.env.local` automaticamente para evitar selecionar um destino por acidente. O helper de importação valida novamente, usa transação, advisory lock e upsert com proprietário global.

A importação manual acima serve para reimportações/atualizações autorizadas, não é necessária para a carga inicial versionada. `/api/health` exige a nova tabela. A migração não depende de `unaccent`, embeddings ou serviços pagos.

## Próxima etapa: Ensinar minha IA

**Interface adiada conforme o pedido. Ainda não existe.** O esquema aceita conteúdo privado para preparar essa evolução, e os testes inserem exemplos apenas no banco descartável. Plano para a próxima etapa:

1. CRUD autenticado de perguntas/respostas próprias, com UUID de registro gerado pelo servidor e proprietário sempre da sessão.
2. Lista, edição, ativação/exclusão e busca exclusivamente entre entradas globais e próprias, com testes de IDOR e limites por usuário.
3. Documentos próprios: inicialmente texto, com limites de bytes/fragmentos, nome e proveniência registrados; conteúdo tratado como dados. Conversão de PDF/DOCX e upload exigem implementação e revisão adicionais.
4. Definir retenção, limites por conta e exclusão de documentos/fragmentos, sem transformar conteúdo do usuário em global por padrão.

Adicionar material não treina um modelo, não faz a aplicação entender assuntos arbitrários nem a torna capaz de gerar programas inéditos. Sem modelo generativo, ela recupera respostas existentes, aplica regras e apresenta templates. Pode não encontrar paráfrases, termos ambíguos ou conceitos ausentes; resultados devem ser conferidos.

## Arquivos principais

| Área | Arquivos |
| --- | --- |
| Acervo/proveniência | `knowledge/a3x-v1/*`, `.gitattributes` |
| Esquema/carga inicial | `sql/003_knowledge_entries.sql`, `sql/004_knowledge_seed_v1.sql` |
| Validação/importação | `lib/knowledge-data.mjs`, `scripts/import-knowledge.mjs`, scripts npm |
| Busca e citação | `lib/knowledge-search.ts`, `app/api/knowledge/route.ts` |
| Integração | `lib/local-conversation.ts`, `app/api/chat/route.ts`, `lib/project-generation.ts`, `lib/research-project.ts`, `components/chat-app.tsx` |
| Prontidão/testes | `app/api/health/route.ts`, `tests/knowledge.test.ts` |

## Resultados locais

- Suíte de regressão e carga inicial: inclui os 18 casos fornecidos, importação idempotente, rollback, preservação de registros existentes pela migração 004, persistência do histórico anterior, privacidade entre duas contas, citação sem HTML ativo e integração no Chat/Programador. A contagem final é registrada na entrega após a execução.
- `npm run typecheck` e `npm run build`: aprovados, incluindo assets standalone.
- `npm run knowledge:validate`: 58 registros válidos; simulação sem banco.
- `git diff --check`: aprovado.

Os testes SQL usam PGlite descartável; não substituem concorrência entre conexões/réplicas ou homologação autorizada em um banco dedicado. Nenhum teste é executado em banco de produção. Publicação e carga inicial são ações de implantação autorizadas, separadas dos testes.
