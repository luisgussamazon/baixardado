# Chat e Modo Programador

Implementação na branch `feature/modo-programador`, derivada de `fix/production-readiness`. Alterações restritas ao A3X AI. Sem merge, push ou deploy pelo agente.

## Uso

Entre com a conta existente e alterne entre Chat e Programador pelo seletor no cabeçalho. O Chat mantém seu histórico, streaming e limites. No Programador, descreva um sistema em até 4.000 caracteres; informe a stack, as funcionalidades e o escopo desejados. A geração transmite progresso e libera o projeto completo após validação.

O explorador exibe diretórios e arquivos; a área de código oferece destaque para JavaScript/TypeScript, CSS, HTML/XML/SVG, JSON, Python, SQL, shell, Markdown e YAML. Outras extensões aparecem como texto. Copie o arquivo selecionado ou baixe o conjunto em ZIP. Projetos ficam no histórico privado por usuário e podem ser excluídos. Em telas pequenas, o histórico é expansível e o explorador aparece acima do código.

## Arquitetura e arquivos

| Arquivos | Responsabilidade |
| --- | --- |
| `components/mode-switch.tsx`, `components/chat-app.tsx` | Navegação entre modos; único ajuste funcional no componente do Chat. Troca bloqueada durante geração/transmissão local. |
| `app/programador/page.tsx`, `components/programmer-app.tsx` | Página protegida pela sessão existente, descrição, progresso, histórico, estados de erro, cancelamento, cópia e download. |
| `components/project-tree.tsx`, `components/code-viewer.tsx`, `app/globals.css` | Explorador, tokens de sintaxe renderizados como elementos React e layout responsivo. Nenhum HTML gerado é injetado nem executado. |
| `app/api/projects/route.ts` | GET lista somente projetos do usuário; POST valida origem, sessão, tipo/corpo JSON e descrição, reserva a cota e inicia SSE. |
| `app/api/projects/[id]/route.ts` | GET consulta somente projeto do proprietário; DELETE também exige origem válida e impede exclusão enquanto a geração está ativa. |
| `app/api/projects/[id]/download/route.ts`, `lib/project-zip.ts` | ZIP privado sob autenticação, com caminhos e conteúdo revalidados. Arquivo de download tem nome derivado exclusivamente do UUID. |
| `lib/project-files.ts` | Contrato de saída, limites e validação defensiva para arquivos recebidos da IA. |
| `lib/project-generation.ts`, `lib/project-events.ts` | Integração OpenAI no servidor e leitura de metadados SSE na interface. |
| `lib/project-store.ts`, `sql/002_programmer_projects.sql` | Persistência com proprietário, estados e reserva transacional. Sem alterações destrutivas no esquema anterior. |
| `app/api/health/route.ts` | Prontidão inclui a nova tabela, impedindo aceitar uma implantação sem a migração. |
| `package.json`, `package-lock.json`, `tests/` | ZIP com fflate, sintaxe com lowlight/highlight.js e testes com PostgreSQL descartável, React Testing Library e DOM local. |

## Segurança e limites

- Todas as rotas exigem sessão; consultas, atualizações e exclusões filtram `user_id`. Um UUID de outra conta não permite leitura ou download. Escritas validam origem e entradas.
- `OPENAI_API_KEY` é lida apenas no servidor. O modelo é `AI_MODEL`, com o mesmo fallback do Chat. Não há troca automática de modelo nem nova tentativa automática de geração.
- A Responses API usa `store: false`, `stream: true` e `text.format` com JSON Schema estrito. O suporte do modelo configurado deve ser confirmado em homologação. Referência: [Structured Outputs da OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
- Máximo de 8.000 tokens de saída, 120 segundos de geração e 256 KiB de JSON bruto recebido. Recusa, JSON inválido, interrupção, timeout, tamanho excessivo ou saída incompleta não liberam código parcial nem ZIP.
- Arquivos: 2 a 20; 32 KiB por arquivo; 128 KiB somados; caminho até 160 caracteres e 8 níveis. Conteúdo é texto UTF-8, sem NUL. Nome do projeto até 80 caracteres, resumo até 2.000.
- Caminhos usam segmentos ASCII relativos com letras, números, `_`, `-` e `.`; são rejeitados caminhos absolutos, `..`, `.`, barras invertidas, caracteres de controle, percent encoding, unidades Windows, dispositivos reservados e segmentos finais com ponto. Também são rejeitados `.git`, nomes de protótipo, `.env` (salvo `.env.example`), duplicatas sem distinguir maiúsculas e conflitos entre arquivo e diretório.
- Nenhum caminho do modelo é usado no sistema de arquivos do servidor. Código e ZIP são dados em PostgreSQL/memória; não há shell, instalação, execução, iframe ou preview HTML de projetos.
- Há limite de 100 projetos armazenados por usuário, incluindo tentativas falhas, e uma geração ativa. Reserva é serializada por advisory lock transacional; cota e registro pendente são gravados juntos, com rollback se a persistência falhar. O pool é liberado antes da chamada à IA.
- A cota diária é a mesma de `DAILY_MESSAGE_LIMIT` usada pelo Chat. Uma tentativa reservada conta mesmo quando falha, é recusada ou cancelada; leitura, cópia e download não consomem cota de IA. Um projeto pode custar mais que uma mensagem do Chat por ter maior teto de saída.
- Estado pendente tem validade de cinco minutos para recuperar encerramentos do processo. Após expirar, o histórico o apresenta como falha; uma nova reserva marca o estado antigo como falha. Cancelar interrompe o transporte, mas não garante ausência de cobrança do provedor ou desfaz uma gravação já concluída. Confira o histórico antes de repetir.
- Respostas privadas usam `Cache-Control: private, no-store`; erros não imprimem conteúdo de arquivos, descrições, chaves ou exceções do provedor.

## Verificação

Resultados locais em 08/11/2026:

- `npm test`: **25 testes aprovados**. Cobrem caminhos e tamanhos, ZIP, protocolo SSE, fluxos de interface, sessão, isolamento entre duas contas, persistência real no PostgreSQL descartável, cota compartilhada, reserva, recuperação, cancelamento e regressão do Chat.
- Migrações inicial e nova executadas em PGlite descartável; a segunda é reaplicada para verificar idempotência e preservação de uma conversa/mensagem anterior. A extensão pgcrypto é omitida apenas no teste, pois PGlite fornece gen_random_uuid.
- `npm run typecheck` e `npm run build`: **aprovados**, incluindo assets standalone. `git diff --check` e verificação do staging: aprovados.
- `npm audit --audit-level=moderate`: **zero vulnerabilidades** na instalação revisada.
- Smoke HTTP do standalone: `/api/projects` e `/api/conversations` retornam 401 sem sessão; `/programador` e `/chat` redirecionam para login; `/api/health` retorna 503 sem configuração; `/logo.svg` retorna 200. Headers de proteção presentes. Processo de teste encerrado.
- Inspeção de uma prévia estática com os componentes reais, criada somente nos testes, em Chrome headless nos tamanhos 1440, 390 e 320 px. Nenhuma rolagem horizontal da página nesses tamanhos; rolagem horizontal do próprio código é intencional. Os arquivos e perfis de inspeção ficam em `.tools/`, ignorada pelo Git.

O PostgreSQL usado pelos testes é local e descartável. O SDK OpenAI é real, mas o transporte é simulado; os testes não gastam créditos nem usam banco de produção. A inspeção visual e os testes em PGlite não substituem teste ponta a ponta autenticado, concorrência entre réplicas ou PostgreSQL via rede com serviços reais.

## Antes da implantação autorizada

1. Instalar dependências por `npm ci` e revisar a branch.
2. Aplicar `npm run db:migrate` pelo predeploy autorizado no Railway. A migração apenas cria a tabela e o índice; não exige alterações nos dados existentes.
3. Confirmar que `AI_MODEL` da conta aceita Responses e Structured Outputs; não mudar a chave para o cliente.
4. Em homologação HTTPS, verificar ambos os modos, duas sessões/contas isoladas, geração completa, cancelamento, limite, reabertura, exclusão e ZIP. Conferir os backups do banco.

## Limitações desta versão

- Gera scaffolds pequenos de arquivos de texto, sem garantia de compilação, qualidade funcional ou segurança do código produzido. Projetos grandes devem ser reduzidos; não há continuação automática de saída truncada.
- Não há edição colaborativa, alterações incrementais em projeto existente, execução, terminal, testes do código gerado, dependências instaladas, preview de sites, binários, upload ou integração GitHub de projetos gerados.
- O modelo pode não fornecer README ou dependências corretas apesar das instruções; o validador garante formato, caminhos e tamanhos, não a semântica do programa.
- Não há fila durável: reiniciar o servidor pode interromper a geração. A recuperação de estado ocorre por expiração, sem reenviar requisições à IA.
- Permanecem as limitações de antiabuso e operação descritas em `REVISAO-TECNICA.md`. O limite de solicitações não representa teto financeiro; configure orçamento e alertas no provedor.
