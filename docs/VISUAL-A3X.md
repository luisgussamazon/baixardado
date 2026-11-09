# Visual azul e laranja — 09/11/2026

Interface baseada na referência fornecida pelo responsável: azul profundo, bordas ciano, detalhes laranja, marca com órbita, ondas vetoriais, navegação lateral e quatro cartões centrais. Marca e decoração em SVG local, sem depender de imagem externa. Tema em `app/a3x-theme.css`, com adaptações para celular e movimento reduzido.

Os atalhos de relatórios e análise preparam uma mensagem editável, sem disparar chamadas de IA ou fabricar resultados. Projetos abre o Programador. Configurações abre a memória da conta; o menu do perfil mantém a saída e conexão local. Nenhum nome de usuário foi fixado na interface. O seletor de modelo, histórico e navegador assistido continuam acessíveis.

Validação local: suíte existente com 176 testes aprovada, novo teste de atalhos aprovado, typecheck e build standalone aprovados, diff check aprovado. Não há migração ou alteração de autenticação, banco, orçamento ou API de IA neste ajuste.

A inspeção visual pelo Computer Use foi interrompida pela ferramenta porque a aplicação de políticas de URL não é suportada no Firefox deste computador. Nenhuma tentativa de contorno foi feita; revisão visual manual em navegador real permanece necessária.

## Tela de entrada

Segunda referência aplicada em `/login` e no formulário compartilhado de primeiro acesso: apresentação com marca e chamada à esquerda, ondas/partículas em SVG local, cartão com borda ciano e laranja, campos com ícones e botão laranja. Em celular, as colunas ficam empilhadas. Os rótulos continuam acessíveis mesmo quando apresentados visualmente como placeholders; mostrar/ocultar senha tem rótulo e estado atualizados.

Endpoints, sessão, validações e redirecionamentos continuam iguais. Quem já está conectado vai para `/chat`; para visualizar a entrada, é preciso sair da conta. Validação: 179 testes aprovados, typecheck, build standalone e diff check aprovados. Testes de formulário usam transporte e dados fictícios locais, sem login ou criação de conta em produção. Conferência visual manual permanece pendente pela limitação de navegador descrita acima.
