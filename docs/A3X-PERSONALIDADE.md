# Personalidade original A3X — assistente tecnológico executivo

Este pacote cria uma identidade conversacional própria, inspirada em assistentes tecnológicos elegantes do cinema, **sem copiar falas, voz, marca ou identidade de personagens**.

## Como interage

- Responde com clareza e educação, sem tratamento excessivamente cerimonioso.
- Usa iniciativa para oferecer **um próximo passo útil**, sem executar ações sozinho.
- Dá continuidade a tópicos identificados nos últimos turnos de usuário da conversa atual.
- Varia cumprimentos de forma determinística, evitando repetir sempre a mesma frase.
- Adapta a conclusão de respostas de conhecimento ao tom `executivo`, `acolhedor` ou `objetivo`.
- Não modifica resultados da busca web, cálculos, mensagens sensíveis ou esclarecimentos de identidade.
- Não finge ser humano, consciente, ter emoções ou realizar ações fora do chat.

## Arquivos

- `config/a3x-persona.ts`: filosofia, princípios, limites e tom padrão.
- `lib/a3x-personality.ts`: adaptação de linguagem e continuidade de assuntos.
- `tests/a3x-personality.test.ts`: testes unitários.
- `app/api/chat/route.ts`: é alterada com duas inserções pequenas pelo instalador.

## Limitações técnicas

Sem modelo de linguagem, essas respostas são **roteiros locais com regras**. Não existe compreensão aberta de linguagem natural, inferência generativa, voz, execução autônoma, emoções, nem capacidade de inventar algoritmos complexos a partir de qualquer pedido. A base existente de conhecimento, a pesquisa web e o PostgreSQL continuam intactos.

Para experimentar variações, ajuste `config/a3x-persona.ts` ou defina explicitamente `tone` ao chamar `enhanceA3XReply`. A configuração é código — alterar o objeto de princípios não modifica automaticamente as regras; as mudanças de comportamento são feitas em `lib/a3x-personality.ts`.

## Segurança

O módulo não acessa rede, não usa APIs pagas, não lê variáveis secretas e não cria tabelas. Não publique respostas que contenham dados sensíveis. Não inclui voz ou imitação sonora de personagem. Preserve a política de sessão, busca apenas por pedido, cotas, histórico e autorização do app.

## Comandos de validação dentro do repositório

```powershell
npm test
npm run typecheck
npm run build
```

Teste a interação na branch de desenvolvimento antes de mesclar com `main` ou publicar no Railway.
