# Desenvolvimento assistido do A3X

**Fluxo anterior, substituído pela [Autonomia A3X](AUTONOMIA-CONTINUA.md).** A interface manual não é mais o caminho normal. `/desenvolver` redireciona para `/autonomia`. APIs e arquivos de propostas anteriores continuam disponíveis por compatibilidade e privacidade; o ciclo autônomo não exige esses passos manuais.

## Identidade e interface

Identidade institucional definida pelo responsável: **A A3X IA foi criada pela A3X TECH, fundada pelos amigos Luis Gustavo e Samuel Moraes.** Respostas diretas usam essa identidade sem consumir API; o contexto dos modelos local e OpenAI também recebe a informação. Não representa autoria dos pesos de modelos de terceiros e não cria papéis administrativos. Perfis pessoais aprovados em Minha memória continuam privados por usuário e separados dessa identidade.

O Chat adota a referência mais sóbria: azul grafite, destaque amarelo, marca tipográfica e cartões em duas colunas com descrição. Em celular, os cartões ficam em uma coluna. A entrada anterior permanece. O modelo real continua `gpt-6-luna`; não foi trocado ou apresentado como um modelo inexistente chamado ASTRO. Não foi acrescentado botão de upload sem funcionalidade.

## Consultar código e pedir melhorias

1. No Chat, selecione GPT-6 Luna e aprove o uso da OpenAI.
2. Abra **Desenvolver A3X · código fonte** no menu, em `/desenvolver`.
3. Leia os arquivos do catálogo e selecione até três arquivos marcados como editáveis. O limite combinado é de 32.000 caracteres, também limitado pela serialização do contexto.
4. Informe um objetivo de até 1.000 caracteres e confirme o envio do objetivo e dos arquivos à OpenAI. Não escreva segredos ou dados pessoais no objetivo.
5. Gere e revise o resumo e cada substituição, com trechos removidos e inseridos. Baixe o JSON apenas após revisar. Não há alteração de código em produção por esse botão.

O código disponibilizado é uma cópia do **build**, não um disco remoto nem leitura arbitrária do servidor. `source-catalog.json` é uma lista versionada de caminhos públicos. O prebuild lê somente esses arquivos regulares, rejeita links simbólicos, exclui conteúdos com formatos reconhecidos de credenciais, normaliza fins de linha e calcula o hash de blob Git. Nunca lê `.env`, `.git`, `.tools`, banco de dados, histórico ou documentos pessoais. O catálogo gerado fica em `.generated/`, fora do Git e de `/public`, e é copiado para o servidor standalone. As rotas exigem sessão; propostas e downloads são isolados por conta. Os fontes já pertencem ao repositório público autorizado `luisgussamazon/baixardado`.

Para incluir novos fontes públicos no catálogo, revise e adicione seus caminhos em `source-catalog.json`. O modelo não altera esse manifesto, as políticas de escopo ou o próprio aplicador. Arquivos acima de 60 KB ficam fora do catálogo; o pacote completo tem limite de 2 MB. A detecção de formatos de credenciais não substitui a revisão de segurança do código versionado. Não versione segredos, mesmo fora do catálogo.

## Aplicar em branch local

Na cópia local correta do repositório, com alterações atuais já revisadas e salvas:

```powershell
npm run source:apply -- --file "C:\caminho\a3x-proposta-ID.json"
```

O comando valida repositório, checkout limpo, hashes exatos, caminhos, limites e substituições únicas. Cria `agent/a3x-<UUID>` e um worktree em `.tools/source-agent/review/<UUID>`. O checkout principal permanece igual. Alterações só podem atingir os arquivos existentes da lista `WRITABLE_SOURCE` em `lib/source-policy.ts`: componentes de apresentação, estilos e personalidade. Autenticação, APIs, SQL, chaves, dependências, scripts e CI são protegidos contra escrita por propostas nesta versão. Não há criação/deleção de arquivos de aplicação.

O aplicador desativa hooks, fsmonitor e configuração global de Git, recusa atributos Git e links simbólicos e verifica sintaxe TypeScript sem importar os módulos propostos. Ele **não executa código gerado, não roda npm install/test/build nessa proposta, não faz commit, push, merge ou deploy**. Revise o diff e valide em sandbox independente antes de publicar. CSS não recebe validação semântica. Filtros estáticos e validação de sintaxe não provam segurança ou correção; código pode estar errado, malicioso ou incompatível. Um worktree é isolamento de arquivos, não sandbox de execução.

Se o hash divergir, atualize a cópia local ou gere outra proposta; não force a aplicação. Se ocorrer interrupção depois de criar o worktree, revise a pasta indicada antes de remover qualquer coisa. Propostas de terceiros ou arquivos JSON modificados exigem revisão tão rigorosa quanto qualquer código externo.

## Custos, erros e limitações

Usa o modelo já configurado e a chave exclusivamente do servidor. Até 4.000 tokens de saída por proposta, sem ferramentas pagas e sem retries automáticos. O mesmo ledger transacional e teto interno global padrão de **US$5/mês** controlam Chat e desenvolvimento. A geração pode consumir mais que uma resposta curta de Chat. O teto não controla outras aplicações ou a fatura total do provedor; veja `OPENAI-LUNA.md`.

Uma proposta ativa por conta e até três tentativas nas últimas 24 horas, incluindo falhas. Propostas ficam privadas no PostgreSQL; itens com mais de 30 dias são limpos oportunisticamente quando a conta solicita outra proposta. JSON incompleto, recusas, arquivos protegidos, trechos ambíguos ou fora do contexto e acessos externos adicionados são recusados, sem aplicação. O provedor pode cobrar tokens mesmo quando a proposta final é inválida. Casos de cobrança incerta conservam a reserva.

Esta versão não é um agente autônomo de autoedição em produção. O Chat comum aponta para a área de desenvolvimento; não ganha acesso arbitrário a arquivos nem executa comandos. O usuário ainda aplica a proposta localmente e decide os testes e a publicação. Não houve ajuste de pesos nem treino do modelo. A interface não garante que o modelo proponha uma melhoria correta ou que consiga realizar tarefas grandes dentro dos limites.

Migração `012_source_proposals.sql` é incremental e aditiva; testes somente em PostgreSQL descartável. O fluxo de aplicação é testado com repositório Git descartável e propostas de fixture, sem executar conteúdo ou publicar. A inspeção visual real continua pendente pela limitação de políticas de URL no Firefox disponível, já documentada em `VISUAL-A3X.md`.

Resultados em 09/11/2026: **187 testes aprovados**, typecheck e build standalone aprovados. Catálogo com 145 arquivos públicos; hash conferido contra Git para amostra, caminhos de ambiente e áreas privadas ausentes. Diff check aprovado. A chave real da API não foi usada nos testes; não houve geração paga nem aplicação de proposta real. As verificações de sintaxe do aplicador não equivalem a testes de comportamento das futuras propostas.

API usada: [Responses com saída estruturada/JSON](https://developers.openai.com/api/docs/guides/structured-outputs), sem execução de ferramentas. A saída é validada novamente pela aplicação; JSON válido por si só não comprova segurança ou conformidade de uma proposta.
