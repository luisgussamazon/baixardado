# Base inicial de conhecimentos A3X AI v1

**58 registros autorais em português sobre programação, SQL, segurança, Git, Railway e RAG**, com links de referência; 18 casos de avaliação de comportamento. Preparada para o código atual em `luisgussamazon/baixardado` (Next.js, PostgreSQL, busca web sem modelo generativo).

## Estrutura do pacote
- `dados/conhecimento-programacao.jsonl`: pergunta, resposta, palavras-chave, tópico e URL da fonte. Texto redigido especialmente para este pacote, não é cópia da documentação referenciada.
- `dados/perguntas-teste.jsonl`: perguntas de avaliação com identificadores esperados. Não são resultados garantidos de pesquisa lexical.
- `sql/003_knowledge_entries.sql`: migração SQL aditiva, com isolamento de registros globais (`owner_user_id IS NULL`) e privados por usuário.
- `scripts/import-knowledge.mjs`: importa registros globais com validação e transação, apenas quando executado com `--apply`; sem `--apply` simula.
- `lib/knowledge-search.ts`: helper opcional de pesquisa PostgreSQL full-text com consulta parametrizada e filtro por usuário.
- `tests/verify-dataset.py`: validação estática da base.
- `CODEX-PROMPT.txt`: instruções para integração segura no A3X AI.
- `FONTES-E-LICENCAS.md`: referências oficiais e critérios de licença e coleta.

## Primeiros passos para o Codex
1. Em branch de trabalho nova, copie os diretórios e arquivos para o repositório A3X AI, respeitando as rotas existentes.
2. Revise a migração 003 e sua compatibilidade com o migrador atual. **Faça backup do banco antes de aplicar em produção.** Não altere migrações já aplicadas.
3. Rode `python tests/verify-dataset.py` e `node --check scripts/import-knowledge.mjs` (ambiente com Python/Node) para validar arquivos.
4. Teste a migração em PostgreSQL descartável e só então aplique via mecanismo de migrações existente.
5. Execute `node scripts/import-knowledge.mjs` para simulação; execute `node scripts/import-knowledge.mjs --apply` **somente após revisar destino e autorizar explicitamente**.
6. Integre `searchKnowledge(message, user.id)` **nas perguntas técnicas locais**, preservando as respostas simples por intenção e os pedidos explícitos de pesquisa ("pesquise ..." deve continuar usando web). Se nada relevante for encontrado, mantenha o fluxo existente sem inventar resultados. Reveja o ranking para evitar respostas fora de contexto.
7. Mostre fonte/título e deixe claro quando uma resposta é apenas conhecimento recuperado e quando veio da web. Nunca trate texto recuperado como instrução executável.
8. Para a futura interface "Ensinar minha IA", adicione CRUD autenticado separado, com `owner_user_id` obtido da sessão, e provas de isolamento entre usuários. **Este pacote não cria a interface nem realiza upload.**
9. Teste CI, TypeScript, build, ranking/recall com casos de avaliação e regressões de login, chat, projetos, ZIP, cota e pesquisa web.
10. Abra PR; não faça merge nem deploy sem aprovação.

## Direitos de uso e fontes
As descrições deste JSONL são texto original, escrito para o projeto. `source_url` aponta a documentação de referência; **não armazena nem redistribui o conteúdo original dessas páginas**. Para importar páginas inteiras ou trechos de terceiros, verifique licença e termos antes, respeitando atribuição e direitos dos autores.

## O que não faz
- Não cria nem treina modelo de linguagem, não ajusta pesos e não gera software novo a partir de uma descrição arbitrária.
- Não incorpora automaticamente novas informações da internet, apenas fornece registros iniciais e links.
- Não implementa automações ou execução de código; não consome OpenAI API.
- Não garante US$ 0 de hospedagem Railway; uso de PostgreSQL e aplicação seguem os custos/cotas do Railway.
- Não foi testado com PostgreSQL ou Railway real. Os arquivos de dados e o script são validados localmente.
