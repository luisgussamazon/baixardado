# A3X AI — pesquisa na web com histórico privado

A A3X IA é criada pela **A3X TECH**, fundada pelos amigos **Luis Gustavo e Samuel Moraes**. Essa identidade institucional não concede privilégios nem representa autoria de modelos de terceiros.

Em [Desenvolver A3X](docs/DESENVOLVER-A3X.md), o modo OpenAI consulta fontes públicos selecionados e propõe melhorias. O usuário revisa o diff e pode aplicar a proposta em branch local isolada com `npm run source:apply -- --file proposta.json`. Nenhum código gerado é executado ou publicado automaticamente.

GPT-6 Luna agora pode ser selecionado no Chat, com chave exclusivamente no servidor e teto interno de US$5/mês. O modo local continua disponível. Veja [configuração e limitações](docs/OPENAI-LUNA.md).

O [Navegador assistido](docs/NAVEGADOR-ASSISTIDO.md), em `/navegador`, oferece uma extensão local para compartilhar capturas revisadas do ICQA, navegar por rotas limitadas e aprovar conhecimento privado. Você faz login diretamente no site. Esta versão não preenche formulários nem altera estoque; o Chat interpreta as capturas compartilhadas, sem controle autônomo de cliques.

## Conversa com modelo aberto na sua máquina

O reconhecimento privado do criador pode ser definido e aprovado em `/memoria`, na seção **Identidade do criador**. Ele recebe prioridade no contexto e não concede privilégios. Veja [detalhes e próximas melhorias](docs/IDENTIDADE-CRIADOR.md).

O Chat pode conversar com **Qwen3 4B Instruct** executado no computador autorizado da conta, sem OpenAI ou API paga de IA. A ponte faz somente conexões HTTPS de saída; o Ollama fica em localhost. Faça a primeira vinculação em `/conectar`. Na ponte atualizada para Windows, a opção de reconexão automática guarda a credencial criptografada por DPAPI para seu usuário, até revogar; reiniciar não exige outro código. O computador precisa continuar ligado e com a ponte em execução. Sem modelo online, permanece o motor por regras, identificado na interface. Veja [instalação, limites e privacidade](docs/MODELO-LOCAL.md).

O [Laboratório de Autonomia Científica](docs/AUTONOMIA-CIENTIFICA.md) compara políticas de roteamento em um benchmark sintético offline. `/laboratorio` mostra resultados com login. `npm run research:study` gera relatório e proposta sem aplicar mudanças; `research:branch` requer confirmação para criar um worktree de revisão, sem commit, push ou deploy. O holdout ficou em 20/24 antes e depois: não houve demonstração de ganho generalizável.

O [A3X Cognitive Engine](docs/A3X-COGNITIVE-ENGINE.md) mantém interpretação por regras, planos persistidos e memória privada aprovada em `/memoria`; a conversa generativa é uma camada opcional com o modelo local autorizado. Para começar um plano: `planeje estudar TypeScript`, depois `iniciar plano`. Fatos, preferências e correções precisam de aprovação explícita. O Programador exige confirmação antes de enviar sua descrição ao buscador.

No Chat, `pesquise ...` prepara a consulta; confirme com `confirmo envio à web` para autorizar seu envio. A confirmação vale apenas para aquela consulta, por até dez minutos.

Aplicação independente em Next.js 15, React 19, TypeScript e PostgreSQL. **OpenAI opcional com consentimento por conta.** O modelo aberto é baixado e executado exclusivamente na máquina autorizada, não no Railway. Pode sintetizar trechos recuperados com fontes, mas também pode cometer erros. A3X AI é a marca do aplicativo; não é um modelo treinado do zero.

O Chat também possui [conversa local por intenções e contexto](docs/CONVERSA-LOCAL.md): cumprimentos, nome no contexto recente, perguntas de continuidade, planejamento inicial e contas simples. Não envia essas mensagens à web. Escreva **pesquise** seguido do assunto para consultar fontes, ou confirme uma oferta de pesquisa. Não equivale a um modelo de linguagem e não compreende assuntos arbitrários.

## Base de Conhecimento A3X AI v1

O pacote fornecido está em `knowledge/a3x-v1/`: 58 registros de programação e 18 casos de avaliação. A integração adiciona pesquisa textual PostgreSQL e mostra título, resposta cadastrada, ID, escopo e referência. Respostas privadas são recuperadas apenas para seu proprietário. Pedidos explícitos de busca web e conversa local continuam preservados; o Programador pode incluir referências locais em um documento privado do projeto.

`npm run knowledge:validate` e `npm run knowledge:import` fazem apenas simulação, **sem acessar banco**. As migrações 003 (esquema) e 004 (carga inicial dos 58 registros fornecidos) foram testadas em banco descartável. Após autorização para publicar, o migrador carrega os IDs ausentes no deploy, sem atualizar registros existentes ou privados. Reimportações/atualizações manuais continuam exigindo `--apply` e confirmação do banco. A interface Ensinar minha IA agora permite cadastro privado de perguntas e respostas, sem upload de documentos.

Veja [BASE-CONHECIMENTO.md](docs/BASE-CONHECIMENTO.md) para comandos, segurança, fontes, resultados e limitações. Recuperar texto não treina uma IA nem gera respostas inéditas.

## Funcionalidades

- Login com scrypt, sessão HttpOnly e histórico privado por usuário.
- Primeiro acesso em `/setup`, protegido por `BOOTSTRAP_SECRET`, encerrado após criar a primeira conta.
- Chat: conversa local por regras e contexto; pesquisa com fontes sob pedido, SSE e salvamento no histórico.
- Busca geral via RSS público do Bing. Se indisponível, busca enciclopédica via Wikipedia em português, identificada como tal. Sem garantia de disponibilidade, cobertura ou ordenação.
- Programador: pesquisa técnica e **template estático** de cinco arquivos (README, pesquisa, HTML, CSS e JavaScript). As regras de negócio descritas não são implementadas automaticamente. Projetos antigos permanecem privados e disponíveis.
- Árvore de pastas, destaque de sintaxe, cópia e ZIP autorizado por proprietário.
- Chat sem cota diária de perguntas; cota separada de projetos, uma criação simultânea e até 100 projetos por usuário.
- Interface responsiva em português. Nenhum código de projeto é executado no servidor.

Consultas são enviadas ao buscador ou à Wikipedia. Não inclua dados confidenciais. O histórico fica no seu PostgreSQL, conforme solicitado pelo responsável. Trechos podem estar incompletos ou desatualizados; confira as fontes.

## Configuração local

Node.js 22+, npm e PostgreSQL:

```bash
npm ci
# Copie .env.example para .env.local e configure suas variáveis privadas.
npm run db:migrate
npm run dev
```

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL obrigatória. |
| `BOOTSTRAP_SECRET` | Segredo de pelo menos 24 caracteres para a primeira conta. Pode ser removido após o cadastro inicial. |
| `DAILY_PROJECT_LIMIT` | Cota de projetos por usuário e dia; padrão 50, máximo 1000. Chat sem cota diária. |
| `NEXT_PUBLIC_APP_NAME` | Nome público, padrão A3X AI. |

Nenhuma chave de IA é necessária. `OPENAI_API_KEY` e `AI_MODEL` são ignoradas e podem ser removidas do painel pelo responsável. Remover o SDK não revoga uma chave antiga no provedor.

## Railway

Repositório autorizado: **luisgussamazon/baixardado**. Não usar ICQA-TOOL ou SSD VBJ2. FANS preservado em `backup-fans-before-a3x-ai`.

1. Mantenha `baixardado` e PostgreSQL no mesmo ambiente.
2. Em **baixardado → Variables**, configure `DATABASE_URL=${{Postgres.DATABASE_URL}}` e um `BOOTSTRAP_SECRET` forte. O nome Postgres deve corresponder ao serviço de banco.
3. Start Command: `npm run start`. A inicialização executa migrações idempotentes **antes** de abrir o servidor, mesmo se o predeploy estiver sobreposto no painel.
4. O predeploy `npm run db:migrate` permanece em `railway.json`. O bloqueio PostgreSQL e `schema_migrations` permitem reaplicação sem perder dados. As migrações criam o esquema inicial e projetos, sem apagar tabelas ou histórico.
5. Se uma migração falhar, o processo encerra com código de diagnóstico seguro, sem imprimir credenciais. Corrija a configuração, sem ignorar essa etapa.
6. O standalone escuta em `0.0.0.0`, respeita `PORT` e serve assets copiados no postbuild. `/api/health` verifica banco e tabelas sem exigir chave de IA.
7. Após o deploy autorizado, abra `/setup` e crie sua conta. Produção exige HTTPS para escritas e cookies seguros.

## Verificação

```bash
npm test
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

CI em `.github/workflows/ci.yml`, sem deploy. Testes usam PostgreSQL descartável e buscas simuladas. Veja [PESQUISA-WEB.md](docs/PESQUISA-WEB.md) e [MODO-PROGRAMADOR.md](docs/MODO-PROGRAMADOR.md).

## Limitações

- Pergunta/descrição até 4.000 caracteres. Cota usa a data do PostgreSQL; tentativas reservadas contam mesmo se falharem ou forem canceladas.
- Histórico: 100 conversas recentes, 200 mensagens por conversa; até 100 projetos por usuário.
- Arquivos: 2 a 20, 32 KiB por arquivo, 128 KiB no total, caminhos de 160 caracteres e 8 níveis. Traversal, colisões, `.git`, dispositivos Windows e `.env` (salvo `.env.example`) são bloqueados.
- O diálogo local usa até 24 mensagens recentes da mesma conversa; cada busca externa continua sendo uma consulta independente. Sem raciocínio generativo ou criação automática de sistemas completos.
- RSS público não é API comercial contratada; revisar termos e contratar uma API de busca antes de oferta comercial. Não contornamos CAPTCHA ou bloqueios.
- Sem upload, voz, cobrança, recuperação de conta, convites ou administração de equipe. Configure backups e proteção de borda.
- `.env*` e `.tools/` são ignorados pelo Git. Nunca versione segredos. Repositório público.

## Diálogo Interativo v2

`/ensinar` permite cadastrar, editar e excluir até 150 perguntas e respostas privadas por conta. Biblioteca editorial com 55 cartões e continuidade contextual. Migrações 003/004 preservadas; 005 adiciona somente novos IDs. Sem upload de documentos ou modelos. [Relatório](docs/RELATORIO-DIALOGO-v2.md).

## Autonomia controlada

Veja [estudos e código experimental](docs/AUTONOMIA-CONTROLADA.md). O Chat não tem cota diária de perguntas. Recursos físicos, concorrência e tempo de resposta continuam finitos.

## Conhecimento privado de inventário

A ponte pode consultar documentos Markdown do pacote fornecido em uma base local criptografada e vinculada à conexão autorizada, com arquivo e seção nas fontes das respostas. Os documentos originais não são publicados nem enviados à busca web. A observação do ICQA é limitada ao HTML público do login, sem operar estoque ou navegar por telas autenticadas. Veja [instalação, privacidade e limitações](docs/CONHECIMENTO-INVENTARIO-LOCAL.md).

O Chat exibe respostas diretas, sem rodapés técnicos repetitivos. Referências ficam recolhidas em **Fontes**; o histórico original é preservado. Veja [comportamento e verificações](docs/RESPOSTAS-DIRETAS.md).
