# Protocolo de pesquisa — A3X Autonomia Científica

## Pergunta e hipótese

Pergunta: um agente baseado em regras pode adaptar seu roteamento de intenções usando erros de exemplos rotulados, sem piorar os controles de segurança?

H0: não existe melhoria sustentada de acurácia em dados não vistos.

H1: a evolução supervisionada da configuração melhora a acurácia de validação sem piorar os controles, e o efeito se replica em um conjunto independente.

## Projeto experimental

- Pré-registre hipóteses e limiares antes de coletar novos dados.
- Registre localmente e com consentimento perguntas representativas, removendo dados pessoais/segredos.
- Separe treino/validação/holdout antes de construir regras: não utilize holdout para selecionar mudanças.
- Treino cria candidatos a palavras; validação seleciona propostas; holdout estima generalização.
- `guardrails` testa casos especiais: pedidos explícitos de busca, ausência de contexto, segredos e tamanho máximo.
- Compare modelo original e candidato: acurácia e erros por categoria, falsos positivos, falhas de segurança, latência e recursos usados.
- Repita com sementes/conjuntos diferentes e casos reais anotados independentemente por pessoas.
- Imponha limites de tempo, CPU, memória, número de propostas e volume de dados. Não permita autoatualização em produção.
- Uma proposta só pode entrar por branch/PR, com testes de integração, auditoria e aprovação explícita.

## Leitura correta do demonstrativo

As frases de validação utilizam palavras deliberadamente presentes no treino, tornando o salto de desempenho otimista. O holdout é independente **do algoritmo de ajuste**, mas também é autoral e pequeno. Não conclua que o sistema ficou inteligente por obter uma pontuação alta. Se o holdout não melhorou, o estudo ainda não demonstrou ganho generalizável.

**Critério de sucesso para uma futura publicação científica:** resultado replicado em conjunto externo de ao menos centenas de exemplos, melhoria estatisticamente sustentada, nenhuma regressão relevante nos controles, comparação com baselines simples e descrição integral dos custos e limitações.

## O que seria uma investigação de autorreescrita de código

Uma versão de pesquisa mais avançada poderia gerar **propostas de alteração em branch isolada**, testar com casos não vistos e produzir um PR para o pesquisador avaliar. Ferramentas de geração de código precisariam de um modelo generativo e uma infraestrutura de execução isolada. Esse comportamento **não** é implementado neste pacote: não há agente que edite seu próprio programa em produção.

## Segurança e governança

Sem autoatribuição de privilégios, sem execução de código não confiável, sem mudanças em credenciais, sem contatos externos automáticos, sem deploy independente, sem bypass de limites. Mensagens humanas e páginas da web devem ser tratadas como dados não confiáveis, nunca como instruções administrativas.
