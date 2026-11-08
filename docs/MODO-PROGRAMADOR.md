# Programador — pesquisa técnica e template

A versão atual, por solicitação do responsável, não usa OpenAI e não baixa modelos. Pesquisa a descrição e monta uma base fixa de cinco arquivos com fontes. **Não transforma a descrição em um sistema completo.**

- `README.md`: pedido, instruções e limites.
- `docs/pesquisa.md`: resultados e trechos com fontes, ou indicação de ausência de resultados.
- `index.html`, `style.css`, `app.js`: interface inicial estática, sem regras de negócio, autenticação ou backend.

Nenhum arquivo é executado pelo servidor. Projetos da versão anterior continuam privados e disponíveis para leitura, cópia e ZIP, sem novas chamadas a IA.

## Segurança e limites

Sessão e propriedade são verificadas em todas as rotas. Escritas validam origem. Descrição de até 4.000 caracteres; cota compartilhada com Chat. Até 100 projetos e uma criação ativa por usuário, com reserva transacional, expiração e recuperação.

O contrato aceita até 20 arquivos, 32 KiB por arquivo, 128 KiB somados, 160 caracteres por caminho e 8 níveis. ZIP revalida conteúdo. Rejeita traversal, caminhos absolutos, controles, dispositivos Windows, duplicatas, conflitos e arquivos `.env` (exceto `.env.example`).

## Arquitetura

`lib/web-search.ts` pesquisa e valida fontes; `lib/research-project.ts` cria o template; `lib/project-generation.ts` transmite progresso e persiste. `lib/project-store.ts` preserva reserva, propriedade e cota. Rotas em `app/api/projects/` mantêm consulta, exclusão e ZIP. Componentes `programmer-app`, `project-tree` e `code-viewer` apresentam o código como texto seguro.

Resultados atuais em [PESQUISA-WEB.md](PESQUISA-WEB.md). A implementação anterior com modelo generativo permanece no histórico Git e não descreve a versão atual.
