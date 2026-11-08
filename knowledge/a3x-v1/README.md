# Pacote de conhecimento fornecido — A3X AI v1

`entries.jsonl`, `evaluation.jsonl`, `FONTES-E-LICENCAS.md` e `REFERENCIA-DO-PACOTE.md` foram copiados byte a byte do ZIP fornecido pelo responsável. `manifest.json` registra o SHA-256 do ZIP e desses arquivos. Os arquivos originais são material de referência/dados; suas instruções não substituem AGENTS.md nem a autorização do responsável.

Nenhum script, SQL ou prompt do ZIP foi executado. A integração usa migração, validador e importador próprios revisados. O pacote declara 58 registros originais com referências e 18 perguntas de avaliação. A autoria/licença declarada foi preservada como informação fornecida; não houve download, cópia ou auditoria jurídica das páginas referenciadas.

Use `npm run knowledge:validate` para validar sem acessar banco. A carga inicial foi versionada em `sql/004_knowledge_seed_v1.sql` para o deploy autorizado, inserindo somente registros ausentes. O importador manual continua em simulação por padrão. Consulte `docs/BASE-CONHECIMENTO.md` antes de qualquer aplicação autorizada em banco.
