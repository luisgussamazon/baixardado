# Reconexão automática do computador

## Causa

O código antigo de pareamento era temporário e de uso único. O token ficava apenas na memória: reiniciar a ponte exigia novo pareamento. Repetir um código já usado produzia um erro de expiração, mesmo quando a conexão daquela conta já havia sido aprovada.

## Mudança autorizada

Em 09/11/2026, o usuário autorizou guardar especificamente a credencial da ponte criptografada pelo Windows, para o usuário atual. A ponte usa DPAPI CurrentUser, com dados em `.tools/local-model-*.dpapi`, ignorados pelo Git. Não armazena o segredo em claro, `.env`, argumentos ou logs. O banco continua contendo apenas o hash.

Uma primeira vinculação com sessão e consentimento é necessária. Ao lembrar o computador, a autorização permanece até revogar. A migração incremental 009 adiciona `remembered=false`: dispositivos anteriores continuam temporários. O novo endpoint de retomada revalida a credencial, a revogação e a propriedade do dispositivo. Ele não aceita um ID de usuário do cliente. Códigos iniciais expirados são substituídos pela ponte; aprovação repetida é idempotente apenas para a conta proprietária.

O instalador de início automático registra somente o supervisor deste projeto na chave Run do usuário Windows. O supervisor tenta manter a ponte em execução no login, sem abrir a API do Ollama, baixar modelos ou pedir senha. Ele não autoriza computadores sozinho: revogar ou perder a credencial exige uma nova primeira vinculação.

## Verificação

- 142 testes aprovados no Windows, incluindo criptografia DPAPI com credencial fictícia, retomada após reinício simulado, recuperação de falha de rede, renovação do código, isolamento entre contas, revogação e opção de não lembrar.
- Migração 009 executada duas vezes somente em PGlite descartável, preservando a validade temporal das conexões anteriores.
- `npm run typecheck`, `npm run build` standalone, sintaxe dos três scripts PowerShell e `git diff --check` aprovados.
- Nenhuma conversa privada de produção foi usada como teste. Não houve reinício ou encerramento da sessão Windows como teste. No CI Linux, o teste nativo de DPAPI é ignorado; os testes de protocolo e API continuam executados.

## Limitações

Não é acesso público ou capacidade ilimitada. O computador precisa permanecer ligado, conectado e com Qwen3 4B Instruct disponível. Malware ou administração com controle do usuário Windows pode comprometer a credencial. Outro perfil Windows não consegue reutilizar diretamente a proteção DPAPI; perder esse perfil exige nova vinculação. Somente o Windows oferece persistência nesta versão. A primeira vinculação deve ocorrer na conta correta; não há bypass do login nem autorização silenciosa de uma conta desconhecida.
