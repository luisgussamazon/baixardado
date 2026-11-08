# Revisão: pesquisa sem modelo e inicialização do banco

## Decisão

O responsável autorizou refazer e publicar sem OpenAI; esclareceu que não quer baixar modelo e quer manter o histórico. A aplicação agora apresenta resultados e trechos com fontes, sem alegar ser um modelo generativo.

## Alterações

- SDK, chamadas e exigência de chave OpenAI removidos. Nenhum modelo baixado, executado ou treinado.
- `lib/web-search.ts`: RSS público Bing com fallback identificado Wikipedia. Até cinco resultados, resposta até 1 MB, timeouts e cancelamento. Rejeição de DTD/entidades XML, URLs com IP, localhost, credenciais ou protocolos executáveis. Nenhum HTML externo é executado.
- Chat mantém sessão, propriedade, cota, gravação e protocolo SSE. Cada pergunta é uma consulta independente.
- Programador mantém histórico, segurança e ZIP; cria template estático com pesquisa, sem alegar implementar funcionalidades completas.
- `scripts/start.mjs` executa migrações antes do servidor, além do predeploy. Falha impede aceitar tráfego e registra somente código seguro.
- Healthcheck exige apenas PostgreSQL e esquema, sem chave de IA. Não consulta os buscadores.
- Login, sessões, hashes e dados existentes preservados. Nenhuma migração destrutiva.

## Evidência anterior

A versão anterior iniciava o Node mas retornava 500 no login e 503 no healthcheck. A mensagem principal do erro PostgreSQL fornecido estava cortada. Ausência de tabelas era uma hipótese, não diagnóstico confirmado. Migração obrigatória no startup elimina essa lacuna e registra código seguro se a causa for outra.

O teste de uma consulta pública retornou resultados RSS do Bing e a API Wikipedia respondeu. Outro buscador retornou desafio; não foi contornado nem utilizado. Isso não garante disponibilidade a partir do Railway ou para toda consulta.

## Verificação

Validação local: 31 testes aprovados, incluindo isolamento, login/logout, streaming, cancelamento, ZIP, filtros de URL, XML e relevância, além de recusa de startup quando a migração falha. Typecheck e build standalone aprovados; auditoria npm sem vulnerabilidades. Testes usam buscas simuladas e PGlite descartável, sem contas ou mensagens fictícias em produção. A publicação e os checks de produção são confirmados na entrega após sua conclusão.

Uma consulta real pelo módulo Node retornou fontes enciclopédicas relacionadas depois de descartar resultados gerais sem correspondência lexical. O filtro reduz erros evidentes, mas não garante relevância semântica. Nenhum resultado foi inventado.

## Limitações

- Não há modelo de linguagem, raciocínio generativo, consciência ou inteligência treinada do zero. O nome é marca do produto.
- Busca pública pode bloquear, falhar ou retornar dados pouco relevantes/desatualizados. RSS não é API comercial contratada; Wikipedia é somente enciclopédica.
- Apenas trechos são apresentados, sem leitura automática das páginas completas. Usuário deve conferir as fontes.
- Consultas são enviadas ao buscador; histórico fica em PostgreSQL conforme preferência do responsável. Não enviar dados confidenciais.
- Remover o SDK não revoga chaves antigas nem altera variáveis no painel; o código não as lê.
