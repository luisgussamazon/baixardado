# Conexões de desenvolvimento

O Chat agora oferece **Conexões** em sua navegação, o Chat X mostra o painel de instalação e `/central/conexoes` reúne os caminhos de GitHub, runner e VS Code. `/central/github` também mostra esse painel. A página inicial e o login normal apontam para `/chat`; o pareamento preserva o destino específico de configurações.

## Fluxo

1. Confira o repositório fixo `luisgussamazon/baixardado` e a permissão do Actions para criar PRs. Os links abrem o GitHub; não representam OAuth novo ou autorização automática. O runner existente usa OIDC e as credenciais temporárias do Actions.
2. Baixe o VSIX, instale no VS Code pelo menu de Extensões e abra ou clone o repositório pelo atalho fornecido. O protocolo `vscode://` exige o editor instalado e confirmação do navegador.
3. Execute `A3X: Conectar workspace`. A extensão abre o código no A3X; confira e autorize nesta conta. Tokens continuam somente em memória e hashes no banco, com prazo de oito horas. O painel mostra expiração, último contato e revogação.
4. Crie uma tarefa na Central, acompanhe os testes e revise o PR. A extensão permite consultar a proposta revisada, mostrar o diff e aplicar com confirmação em worktree isolado.

## Limitações reais

Não é uma integração com o produto Codex nem equivale ao seu conjunto completo de ferramentas. Não conecta outros repositórios, não oferece terminal remoto ou OAuth genérico, não sincroniza o filesystem e não concede acesso irrestrito. Links para GitHub não provam autenticação do usuário. Um dispositivo autorizado sem contato recente não prova que o editor esteja online. A instalação real no Extension Host depende do computador do usuário e não foi validada automaticamente. O VSIX é local e não é publicado no Marketplace ou assinado por ele.

O pacote gerado no build usa somente os arquivos públicos explícitos de `extensions/a3x-workspace`, nunca arquivos locais ou credenciais. Nenhuma migração, dependência ou permissão de escrita do agente foi ampliada nesta mudança.

O instalador é gerado em `.generated/a3x-workspace.vsix` e servido por uma rota autenticada com download e cache privado. Isso mantém o build e o teste compatíveis com o contêiner que monta o código e `public` somente para leitura, sem ampliar as permissões do sandbox. Foram adicionados testes de rejeição sem sessão e igualdade dos bytes do download com o pacote gerado.

## Validação

Os testes cobrem os caminhos de instalação, download e runner, a ausência de aprovação automática, código + consentimento no pareamento, conteúdo restrito do VSIX e redirecionamento de login. A execução interativa do VS Code e um ciclo real GitHub não são substituídos por esses testes.

Validação local em 13/11/2026: `npm test` com 216 aprovados, zero falhas e zero ignorados; `npm run typecheck` e `npm run build` aprovados. Os três testes da Central/conexões foram repetidos após o ajuste final de carregamento e passaram. `git diff --check` sem erros. Nenhum banco de produção, segredo ou API paga foi utilizado. Instalação real no Extension Host e publicação desta alteração não fazem parte desses resultados locais.
