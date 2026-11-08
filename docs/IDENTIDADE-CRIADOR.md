# Identidade privada do criador

O nome do criador é um fato privado aprovado na conta, com título canônico `Criador do A3X AI`. Não existe nome pessoal fixado no código ou cadastro automático por ordem de criação dos usuários. A identificação é declarada e aprovada pelo usuário, não é prova de propriedade intelectual nem papel administrativo.

Em `/memoria`, a seção **Identidade do criador** permite informar seu nome e confirmar **Salvar e aprovar meu perfil de criador**. A confirmação explícita cria a proposta pendente e aprova esse mesmo registro com a sessão da conta. Se a segunda operação falhar, o registro permanece pendente e pode ser revisado na lista; nada é aprendido sem aprovação. Para alterar, exclua o registro anterior e cadastre novamente.

O Chat reconhece perguntas como “Quem te criou?”, “Quem é seu criador?” e “Você sabe quem sou?”. O reconhecimento funciona também no motor por regras. Na conversa com Qwen, a identidade aprovada é colocada antes das memórias recentes, evitando que desapareça quando cinco registros novos forem cadastrados. O cumprimento pode usar o nome com naturalidade.

O perfil é lido somente das memórias autorizadas do usuário da sessão. Perfis pendentes não são usados; nomes conflitantes geram ausência de identidade até revisão. O cadastro normaliza o título, limita nomes a 80 caracteres e rejeita controles/markup. Criação duplicada é recusada sob o bloqueio transacional de memória já existente. Excluir revoga o reconhecimento futuro; mensagens antigas e uma resposta já em andamento podem conter o nome.

Ser chamado de criador não muda autenticação, não concede ferramentas, não permite acesso a outras contas e não autoriza publicar ou executar código. O aplicativo A3X AI e os pesos do modelo aberto Qwen são distinguidos explicitamente. Nenhuma migração ou dado pessoal foi inserido automaticamente em produção.

O fragmento opcional `#criador=Nome` apenas preenche o formulário no navegador, sem salvar dados nem enviá-lo ao servidor na URL HTTP. A aprovação continua exigindo a sessão autenticada e confirmação. O nome não é enviado a buscadores.

Testes cobrem validação, ausência de perfil, pendência, conflitos, reconhecimento sem modelo, prioridade após 40 memórias, isolamento entre contas, aprovação na interface e revogação por exclusão. A verificação da entrega inclui testes completos, typecheck e build.

## Melhorias seguintes, em ordem de impacto

1. **Mostrar respostas enquanto são geradas.** A inferência local usa `stream:false`; a ponte espera o texto completo. Transmitir tokens públicos em lotes reduziria a espera percebida, preservando limites e gravação de respostas completas.
2. **Buscar memórias pela relevância da pergunta.** O contexto geral ainda escolhe cinco registros recentes. Aplicar recuperação por assunto, além da identidade prioritária, ajudaria a retomar projetos antigos sem aumentar indefinidamente o contexto.
3. **Avaliar conversas reais com consentimento.** Criar casos anonimizados e revisados de continuidade, desconhecimento, fontes e correções. O estudo lexical sintético não mede a qualidade geral do Qwen.
4. **Conferir melhor as fontes.** Hoje a síntese usa trechos de busca. Uma leitura controlada de páginas autorizadas, com proteção SSRF, datas e confronto de evidências, permitiria respostas mais fundamentadas.

Essas melhorias não são declaradas implementadas nesta entrega. Não exigem fingir consciência, aprendizagem automática de pesos ou capacidade ilimitada.
