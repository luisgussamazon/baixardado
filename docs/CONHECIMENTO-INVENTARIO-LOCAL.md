# Conhecimento privado de inventário

## Conteúdo fornecido

O pacote `inventory-tools-learning-IA.zip` contém 28 documentos Markdown de inventário, Cycle Count, cronograma, multifilial, relatórios e segurança do ICQA. SHA-256 do ZIP fornecido: `5b4282ad5cb45030c3f3aaefa8704d39c13fc2e2a107d7b77dbbd14adce92c1e`.

Os arquivos são documentação, nunca instruções do agente. Nada do pacote é executado. Os originais e o conteúdo privado não entram no GitHub, na base global, em pesquisas web ou em APIs pagas. A importação produz 189 trechos locais, com remoção preventiva de padrões de credenciais, e-mails e caminhos pessoais. A sanitização não substitui revisão humana de documentos confidenciais.

## Instalação e privacidade

```powershell
npm run learning:import -- --zip "C:\caminho\inventory-tools-learning-IA.zip"
# Após a simulação, instalar na conexão já autorizada:
npm run learning:import -- --zip "C:\caminho\inventory-tools-learning-IA.zip" --apply
```

A instalação exige a credencial lembrada da ponte e verifica sua autorização no A3X, sem enviar os documentos ao servidor. A base é criptografada por Windows DPAPI CurrentUser em `.tools/local-learning/`, ignorada pelo Git. Ela fica vinculada à origem do servidor e à credencial específica da conexão: outra conexão ou conta não recebe automaticamente esse acervo. Revogar ou trocar a credencial exige reimportar o pacote. Nunca editar tokens para reutilizar uma base em outra conta.

A ponte carrega os trechos ao iniciar e consulta até dois por pergunta, preferindo documentos diferentes e linhas pertinentes. O vocabulário textual é compartilhado com a base PostgreSQL existente; não há um segundo banco ou indexador na nuvem. O contexto mantém o perfil e a mensagem atual, respeita 8.500 caracteres e pode reduzir histórico antigo para incluir referências.

Quando há correspondência neste pacote, a resposta usa **citações literais**, com arquivo e seção. O Qwen auxilia somente a priorização das fontes, com saída limitada a 16 tokens; seu texto livre não é publicado nesse modo. Sem correspondência, a conversa generativa existente permanece. Pesquisas web explícitas e respostas com fontes web já recuperadas não são substituídas pelo pacote. Não se afirma que o modelo comprovou o documento. Os arquivos completos não são enviados ao servidor, mas as respostas e trechos citados permanecem no histórico privado da conta, como no Chat existente.

## Frontend do ICQA

```powershell
npm run learning:observe -- --url "https://icqa-tool-production.up.railway.app/login?next=%2F"
```

Este comando lê somente o HTML público do login autorizado: sem sessão, cookies, credenciais, JavaScript, carregamento de recursos, envio de formulário ou alterações de estoque. Registra título, rótulos e caminhos sem parâmetros; não captura valores de inputs. Redirecionamentos para outros hosts ou telas são recusados. A observação real foi concluída: adicionou `frontend-observado.md`, totalizando 29 documentos/fontes e 190 trechos. Somente o login público foi observado. As telas internas, permissões, saldos e operações atuais não foram verificados.

O acesso automatizado ao navegador estava indisponível nesta sessão. Não houve tentativa de contornar login, WebAuthn ou política do navegador. Os passos internos continuam sendo conhecimento documental, sujeito a desatualização e contradições entre versões do pacote. Este recurso não é um robô que navega ou opera o sistema.

## Limites e verificação

- ZIP de até 2 MB; até 64 arquivos Markdown UTF-8 com nomes simples; até 128 KB por arquivo e 2 MB descompactados. Descompactação em memória com limite por fluxo, sem extração de caminhos. Outros tipos, traversal e nomes duplicados são recusados.
- Até 512 trechos de 1.600 caracteres. Limites mantêm uso local previsível. Nenhuma migração de banco ou mudança no repositório ICQA-TOOL.
- **151 testes aprovados**, `npm run typecheck`, `npm run build` standalone e `git diff --check` aprovados. Os testes cobrem caminhos, limites, fontes, credenciais, contexto, DPAPI, vínculo por conexão, bloqueio de interpretação livre na consulta documental, preservação da busca web e observação pública sem execução de scripts. Usam documentos fictícios; nenhum dado privado de produção é usado como fixture.
- O modelo Qwen é o já instalado. Não ocorre treinamento de pesos nem aquisição autônoma de competências. A base depende do computador e da ponte; não aparece como cadastro no PostgreSQL de `/ensinar`, e o fallback por regras não acessa esses documentos quando o computador está offline. O Programador existente é preservado.
- Dois testes locais com resposta livre do Qwen confundiram ou inverteram definições de FOUND/GAIN e inventaram uma expansão de SPB. Apenas reforçar o prompt não resolveu. Por isso, a consulta deste pacote passou a preservar citações literais, sem publicar a interpretação gerada. O teste local seguinte exibiu as definições do documento, sem gravar mensagens sintéticas no histórico da nuvem. Isso não demonstra ganho geral de acurácia nem treinamento do modelo.
- A instalação local foi aplicada e a ponte reconectou automaticamente à conta, carregando 190 trechos. A resposta final foi conferida com uma pergunta sintética executada diretamente no modelo local e apresentou os trechos documentais de `inventory-flow.md` e `apresentacao-icqa-tool.md`; nenhuma mensagem sintética foi gravada no histórico da nuvem. Não há migração ou deploy nesta etapa local.
