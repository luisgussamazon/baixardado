# A3X Workspace — extensão local

Sem dependências de runtime além de Node/VS Code. Abra esta pasta em uma Extension Development Host (F5 usando o `launch.json`) ou instale o VSIX produzido com `npx @vscode/vsce package --allow-missing-repository`. Esse empacotamento requer obter a ferramenta pública; não é executado automaticamente pelo app.

Use `A3X: Conectar workspace`, selecione apenas `luisgussamazon/baixardado` e autorize o código na central autenticada. O token permanece somente em memória e expira após oito horas. Reiniciar exige novo pareamento. O servidor guarda apenas hashes. Revogue em Configurações.

Arquivos e pesquisa são locais, limitados ao manifesto de fontes, sem `.env`, links ou caminhos externos. Nenhum conteúdo local é enviado automaticamente. Propostas são recuperadas apenas da conta que autorizou o computador, após testes no runner, e aplicadas com consentimento a branch/worktree isolado. Checkout limpo, commit base e blobs exatos obrigatórios. Não executa código proposto, testes, build, terminal ou publicação no computador. O comando Testes abre a fila de comandos fixos no runner. A reversão só restaura o arquivo alterado se ele continua idêntico à aplicação desta sessão; alterações posteriores são preservadas e bloqueiam a reversão automática.

Não há sincronização automática de todo o filesystem nem acesso a outros repositórios. A integração precisa ser instalada e autorizada para operar; os testes de filesystem não substituem esse teste interativo no VS Code real.
