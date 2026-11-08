# Relatório — Diálogo Interativo v2

## Revisão e instalação
Branch feature/a3x-dialogo-interativo criada de origin/main. AGENTS.md, README e instruções do pacote revisados. Os 20 arquivos conferiram com SHA-256. A simulação original foi executada antes de alterações e interrompeu sem escrita por âncora incompatível no chat. O pacote usava uma versão anterior; a integração manual preservou a migração 003, a 004, o importador seguro e a busca textual existentes. Não usamos --apply para sobrescrever arquivos divergentes.

## Alterações
- dados/ e lib/dialogue-knowledge.ts: 55 cartões editoriais, ranking lexical, respostas, detalhes contextuais e fonte por ID. Continuidade usa até 24 mensagens recentes.
- app/ensinar/ e components/knowledge-app*: interface responsiva para cadastrar, editar e excluir perguntas e respostas privadas, com carregamento e erros.
- app/api/knowledge/: sessão obrigatória, origem válida nas mutações, validação de JSON e limites de entrada. Proprietário vem exclusivamente da sessão. UPDATE e DELETE filtram por proprietário. Criação usa transação e bloqueio PostgreSQL por usuário para impor 150 registros. Campos desconhecidos e URLs inseguras são rejeitados.
- GET /api/knowledge?q=... preserva pesquisa. GET sem q lista somente registros da conta. Conteúdo privado pode prevalecer sobre cartões editoriais.
- sql/005_dialogue_seed_v2.sql: adiciona os 55 conhecimentos fornecidos, apenas IDs ausentes. Uma instalação nova possui 113 registros globais. Migrações 003 e 004 permanecem intactas.
- Chat, histórico, SSE, autenticação, cotas, pesquisa explícita e Programador mantidos. Nenhum modelo, API paga ou execução de código foi adicionado.

## Verificação
67 testes automatizados aprovados na rodada final, incluindo CRUD com dois usuários, CSRF, limite de 150 registros, privacidade, busca, chat e Programador. Typecheck aprovado. Build de produção executado; conclusão registrada na entrega.
Migrações 001–005 e reaplicação de 003 e 005 exercitadas somente em PGlite descartável, motor PostgreSQL em WASM. Nenhuma migração de teste foi executada contra produção. A variante antiga de 003 do pacote não foi instalada; a migração 003 efetiva do projeto foi preservada e testada. A 005 é aplicada pelo migrador normal na publicação autorizada.

## Limitações reais
Não é um modelo generativo. Respostas vêm de regras, cartões editoriais, registros cadastrados ou trechos web. Ranking pode selecionar resultados inadequados ou não reconhecer paráfrases. Confira as fontes. Não há aprendizagem automática, mensagens espontâneas, embeddings, upload de documentos/PDF ou execução de código. Programador continua um template estático com pesquisa e não cria sistemas arbitrários.
Editar ou excluir conhecimento não remove mensagens e projetos já salvos. Busca web depende de serviços públicos e envia a consulta ao buscador. Fontes cadastradas não são automaticamente visitadas nem verificadas. Contexto não é memória ilimitada.
PGlite valida SQL e isolamento lógico, mas não substitui testes de conexão, TLS, permissões, backups e carga de um PostgreSQL Railway real. Verificações públicas após deploy não cobrem login com credenciais reais nem operações privadas em produção. Não criamos usuários fictícios ou dados de teste em produção.
