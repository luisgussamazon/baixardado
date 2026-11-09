# Navegador assistido — ICQA

Esta versão acrescenta uma extensão local Chrome/Edge e a página `/navegador` ao A3X. Não altera o código do ICQA. O usuário entra no site diretamente no navegador; a extensão aproveita a sessão dessa aba, sem ler cookies, senhas ou valores dos campos. Acesso ao modelo de linguagem não fornece controle de navegador por si só.

## Como usar

1. No A3X, abra **Navegador assistido**, baixe e extraia o ZIP da extensão.
2. No Chrome/Edge, abra a página de Extensões, ative **Modo do desenvolvedor** e use **Carregar sem compactação**, escolhendo a pasta extraída. Chrome 120 ou superior; não exige publicação em loja.
3. Abra a extensão e clique em **Conectar à minha conta A3X**. Abra o endereço de autorização, confira o código e autorize na conta correta. O código vale dez minutos, apenas uma vez. Não compartilhe o código.
4. Entre no ICQA normalmente, depois abra a extensão nessa aba e clique **Usar esta aba do ICQA**. Apenas essa aba fica vinculada. Não envie sua senha pelo Chat.
5. Clique **Revisar tela atual**, remova dados pessoais, segredos e informações que não deseja compartilhar e use **Enviar trecho revisado ao A3X**. A revisão do texto é obrigatória; a redação automática de e-mails/tokens não garante anonimização completa.
6. No Chat, clique **Carregar telas**, selecione a captura e faça a pergunta. Com GPT-6 Luna, cada pergunta com captura exige confirmação específica de envio à OpenAI. A resposta pode citar `[P1]` e mostra a URL em Fontes.
   Com uma tela selecionada, comandos diretos como **Abra o cronograma**, **Vá para relatórios** e **Abra o início** propõem uma navegação com botão de confirmação. Não executam navegação nem consomem API por si só. Reconhecimento desses comandos é por regras, não uma decisão autônoma do modelo. Ao recarregar a conversa, pode ser necessário repetir o pedido para obter o botão.
7. Para aprender permanentemente: em `/navegador`, atualize as telas, escolha **Revisar como conhecimento privado**, corrija o trecho e aprove o salvamento. Ele usa a base privada já existente e pode ser editado/excluído em **Ensinar minha IA**. Conhecimento aprovado pode participar do contexto do modelo escolhido, incluindo OpenAI, conforme consentimento da conta.

## Capacidades e limites

- Navegação assistida pelos botões da página A3X, em rotas fixas do ICQA: `/`, `/schedule`, `/dashboard`, `/inventory`, `/inventories`, `/reports`. Cada navegação é confirmada pelo usuário; não aceita URLs arbitrárias, queries, fragmentos, outros domínios, `/api`, login ou logout. Algumas rotas podem não existir no site implantado; a lista não foi comprovada em sessão autenticada.
- A extensão consulta comandos em intervalos de aproximadamente 30 segundos. Navegador suspenso, aba fechada, site indisponível, sessão encerrada ou extensão desligada impedem o funcionamento. Não existe garantia de execução no prazo. Comandos expiram em dois minutos e são reivindicados apenas uma vez; não há repetição automática. Confirmação `done` significa que o navegador aceitou a mudança de endereço, não que a página carregou ou uma operação foi concluída.
- O modelo interpreta capturas revisadas, mas **não controla cliques ou formulários livremente**. A navegação acontece pelos controles explícitos ou confirmação de um comando direto reconhecido no Chat. Esta versão não preenche nem envia formulários, não altera estoque, não exclui itens e não contorna autenticação/MFA/CAPTCHA. Alterações de dados continuam manuais; um executor futuro precisa de especificação e confirmação concreta por operação.
- Somente texto renderizado do frame principal, até 6.000 caracteres; não interpreta imagens, gráficos, canvas, iframes ou tabelas extensas de forma completa. O modelo recebe até 1.200 caracteres do trecho e contexto serializado limitado. Capturas podem ficar incompletas e desatualizadas. Não há navegação autônoma exploratória.
- Aprender significa **recuperar observações revisadas na base privada**, não treinar pesos, aumentar consciência ou demonstrar domínio operacional. Uma tela isolada não comprova regras de negócio ou resultados. O usuário precisa corrigir informações antes de aprovar.
- Nenhuma ferramenta paga de navegação é ativada. GPT-6 Luna continua sujeito ao teto interno estimado de US$5/mês e ao crédito real da API. Interpretar uma captura consome tokens.

## Segurança e dados

- Duas conexões ativas por conta, validade de 12 horas. Token aleatório de 256 bits somente em `chrome.storage.session` (memória da sessão da extensão); no PostgreSQL fica hash SHA-256. Reiniciar/recarregar a extensão ou navegador exige novo vínculo. Não usa `storage.local`, `storage.sync`, chave OpenAI no PC, scripts remotos ou permissões para todos os sites.
- A extensão não expõe um canal de comandos a páginas web. Só consome navegação estruturada da própria conta; origem e rota são verificadas no servidor e novamente na extensão. Não executa seletores, JavaScript, comandos de shell ou código sugerido por páginas/modelos. O coletor de DOM é código fixo empacotado com a extensão.
- Somente a captura enviada após revisão chega ao servidor A3X. Ela fica recuperável por 30 minutos, vinculada à conta e conexão; é substituída pela próxima captura. Limpeza física é oportunista nas consultas/polling e na remoção de dispositivos expirados, não um expurgo agendado no instante exato. Backups do banco seguem a política do serviço de hospedagem.
- Revogar no A3X apaga dispositivo, captura e comandos por cascata. Desconectar na extensão limpa a credencial local; para revogar no servidor, use também o botão do A3X. Uma navegação já enviada ao navegador pode estar em andamento.
- Respostas históricas marcadas como oriundas de `[P1]` não são reproduzidas automaticamente no contexto OpenAI ao mudar do modo local. Texto digitado/colado pelo usuário e conhecimento privado explicitamente salvo seguem o consentimento normal da conta. Capturas e suas instruções são conteúdo não confiável e não acionam operações.

## Validação

Migração incremental `011_browser_companion.sql`, aditiva, testada duas vezes em PostgreSQL PGlite descartável. APIs com sessão e origem para ações da conta; bearer independente para a extensão. Testes cobrem isolamento, quota, expiração, revogação, claim único, validação de URL, bloqueio de envio à nuvem sem confirmação, transporte SSE e contexto, coleta com DOM simulado e worker com Chrome simulado. Nunca executar testes no banco de produção.

Ainda é necessário um teste manual ponta a ponta após instalação da extensão com o usuário fazendo login no ICQA. Testes simulados não comprovam permissões efetivas, layout, navegação, políticas corporativas de instalação ou comportamentos do navegador real. Nenhuma tela autenticada do ICQA foi acessada nesta implementação.

Resultados locais em 09/11/2026: **176 testes aprovados**, `npm run typecheck` aprovado, `npm run build` aprovado com ZIP da extensão e preparação standalone. ZIP validado com os sete arquivos previstos, sem credenciais. `git diff --check` aprovado. Nenhuma chamada paga ou alteração de estoque foi realizada pelos testes. A validação do navegador real depende da instalação e do login manual acima.

Referências técnicas: [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [storage](https://developer.chrome.com/docs/extensions/reference/api/storage), [alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms).
