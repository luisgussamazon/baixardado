# Respostas diretas no Chat

## Mudança

A resposta documental era acompanhada por apresentação do mecanismo, nomes de arquivos em títulos e avisos genéricos. O servidor ainda acrescentava um rodapé Qwen; respostas por regras recebiam uma nota técnica de confiança. Esses textos tornavam a resposta longa sem ajudar a responder à pergunta.

O Chat passa a mostrar somente a resposta, com fontes recolhidas em **Fontes**. O botão Copiar usa somente o texto visível da resposta. Mensagens antigas são apresentadas sem esses avisos, sem alterar ou apagar o histórico no banco. Exemplos de código mantêm seu conteúdo, mesmo quando contêm palavras usadas nos rodapés.

A consulta ao pacote local continua extrativa: limpa a formatação, prioriza linhas pertinentes à pergunta e evita repetir documentos que dizem a mesma coisa. Não publica a interpretação livre do modelo sobre os fatos operacionais. A orientação do modelo pede resposta direta; falta de informação relevante continua sendo declarada, sem um aviso genérico em todas as respostas.

## Preservação

Login, autorização, isolamento por usuário, histórico, streaming, pesquisa web, memória e Programador permanecem. Fontes continuam disponíveis, incluindo documentos privados, referências cadastradas e resultados web. Não há alteração de esquema nem reescrita de mensagens armazenadas. Os documentos originais do ZIP e a base privada criptografada continuam fora do Git e do deploy.

## Verificação

155 testes, typecheck, build standalone e `git diff --check` aprovados. Cobertura inclui respostas documentais sem apresentação técnica, fontes recolhidas, limpeza do histórico apenas na exibição, cópia sem rodapé, código preservado, incerteza pertinente e os fluxos existentes. A ativação exige a versão atualizada da ponte local e da interface do Chat.
