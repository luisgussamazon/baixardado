import { DEFAULT_TONE, type A3XTone } from "../config/a3x-persona";

/** Um módulo local e determinístico: nenhuma API ou modelo é usado. */
type Turn = {role: "user" | "assistant"; content: string};
type Decision = {kind: "search";query: string} | {kind: "reply";text: string;knowledgeQuery?: string};
export type PersonaInput = {
  message: string;
  history: ReadonlyArray<Turn>;
  decision: Decision;
  original: string;
  hasKnowledge: boolean;
  tone?: A3XTone;
};

type Topic = "deploy" | "git" | "pr" | "codex" | "postgres" | "custos" | "aprender" | "codigo" | "web" | "seguranca";
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g," ").trim();
const variants = <T,>(arr: readonly T[], seed: string, turns: number): T => {
  let n=turns;
  for (const ch of seed) n=(n*31+ch.charCodeAt(0))>>>0;
  return arr[n%arr.length];
};
const isFollowup = (t: string) => /^(sim|claro|pode|continue|continua|e depois|qual o proximo passo|como faco|me explica|explique melhor|detalhe|quero|vamos la|prossiga)[?!. ]*$/.test(t);
const isGreeting = (t: string) => /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|fala comigo|conversa comigo|vamos conversar|quero conversar|oi tudo bem)[!?. ]*$/.test(t);
const isSmalltalk = (t: string) => /^(tudo bem|como vai|como voce esta|voce esta bem)[?!. ]*$/.test(t);
const isSensitive = (t: string) => /\b(triste|ansios[oa]?|desanimad[oa]?|depress|suicid|machucar|me matar|nao aguento|socorro)\b/.test(t);
const isSecret = (t: string) => /\b(senha|token|api.?key|chave secreta|segredo|credencial)\b/.test(t);
const isIdentity = (t: string) => /\b(quem e voce|voce e humano|voce e uma pessoa|voce e consciente|voce tem sentimentos|o que voce e|voce pensa|como voce funciona)\b/.test(t);
const isArithmetic = (t: string) => /^(quanto (e|da)|calcule|calcular|conta)\s*[:=]?\s*[\d(+-]/.test(t) || /^[\d(+-]/.test(t);

function detectTopic(raw: string): Topic | null {
  const t=normalize(raw);
  if(/pull request|\bmerge\b|\bpr\b/.test(t)) return "pr";
  if(/\b(git|github|repositorio|branch|commit|push|clone)\b/.test(t)) return "git";
  if(/\b(codex|vs code|vscode|extensao)\b/.test(t)) return "codex";
  if(/\b(postgres|postgresql|banco de dados|database_url|migrac)\b/.test(t)) return "postgres";
  if(/\b(railway|railwa|deploy|hospedagem|dominio|servidor|site online|publicar o site)\b/.test(t)) return "deploy";
  if(/\b(custo|gratis|gratuito|free|cobranca|gastar|sem pagar)\b/.test(t)) return "custos";
  if(/\b(programacao|programar|criar codigo|codigo fonte|typescript|javascript|python|sistema|projeto completo)\b/.test(t)) return "codigo";
  if(/\b(ensinar|minha ia|aprend|conhecimento|personalidade|treinar)\b/.test(t)) return "aprender";
  if(/\b(pesquisa web|busca web|pesquisar na internet|pesquisa na internet|fontes externas)\b/.test(t)) return "web";
  if(/\b(seguranca|privacidade|dados privados|proteger|acesso indevido)\b/.test(t)) return "seguranca";
  return null;
}
const introductions: Record<Topic, string> = {
  deploy: "O Railway é a hospedagem do A3X AI. Para corrigir um site indisponível, precisamos olhar o deploy e os logs antes de alterar o serviço.",
  git: "Git registra as mudanças localmente e GitHub mantém o repositório remoto. O caminho seguro é conferir a branch, revisar os arquivos e só depois enviar.",
  pr: "Um Pull Request propõe incorporar uma branch à principal, mas não faz o merge automaticamente. É uma etapa importante para revisar com segurança.",
  codex: "O Codex ajuda a ler e alterar o código no VS Code. Ele deve trabalhar na pasta correta, executar os testes e mostrar o diff antes da publicação.",
  postgres: "O PostgreSQL guarda contas, histórico e dados da aplicação. No Railway, a conexão deve utilizar a variável do serviço de banco, não o endereço localhost.",
  custos: "É possível manter o A3X AI sem pagar por uma API de IA, mas a hospedagem e o banco podem gerar custos. Acompanhar cotas e limitar recursos evita surpresas.",
  aprender: "Podemos ensinar o A3X AI adicionando perguntas, respostas e materiais à base de conhecimento. Ele recuperará esses dados por assunto; isso não treina um modelo de linguagem.",
  codigo: "Podemos organizar um projeto em requisitos, arquivos, código e testes. Sem modelo generativo, o A3X AI oferece exemplos e templates, mas não cria livremente qualquer programa complexo.",
  web: "A busca na web recupera links e trechos de fontes públicas. Convém conferir a página original, porque o resultado pode estar incompleto ou desatualizado.",
  seguranca: "Vamos priorizar dados privados, validação de entradas e autorizações. Chaves e senhas devem ficar fora do GitHub e nunca aparecer nas respostas.",
};
const nextSteps: Record<Topic, string> = {
  deploy: "Próximo passo: abrir **Deploy Logs** do serviço `baixardado` e identificar o primeiro erro. Quer examinar esse log comigo?",
  git: "Próximo passo: executar `git status` e `git remote -v` na pasta do A3X AI. Posso explicar cada resultado.",
  pr: "Próximo passo: abrir **Pull requests → New pull request**, escolher `main` como base e sua branch como comparação. Não faça merge antes de revisar os testes.",
  codex: "Próximo passo: pedir ao Codex que leia `AGENTS.md`, altere uma branch de trabalho e rode `npm test` e `npm run build`.",
  postgres: "Próximo passo: conferir se o PostgreSQL existe no projeto Railway e se `DATABASE_URL` referencia esse serviço, sem copiar segredos aqui.",
  custos: "Próximo passo: definir um teto rígido de consumo na hospedagem e deixar a cota diária do A3X AI ativa.",
  aprender: "Próximo passo: cadastrar uma pergunta com resposta validada e testar a mesma dúvida no Chat. Quer começar por programação ou pelo seu negócio?",
  codigo: "Próximo passo: definir a função principal do sistema, a linguagem e o primeiro teste. Qual sistema você quer construir?",
  web: "Próximo passo: usar `pesquise` seguido de um assunto específico e conferir os links retornados.",
  seguranca: "Próximo passo: revisar se `.env.local` está ignorado pelo Git e se as rotas verificam o usuário autenticado.",
};
const detailed: Record<Topic, string> = {
  deploy: "Para investigar: **1.** Abra o serviço `baixardado` no Railway. **2.** Entre em Deployments e selecione o deploy ativo. **3.** Leia Deploy Logs, procurando falhas de inicialização, banco e porta. **4.** Só depois corrija a configuração e teste `/api/health`.",
  git: "Na pasta do projeto, use `git status` para conferir os arquivos. Depois `git diff --check`; revise o que será registrado com `git diff --cached`. Só então faça `git commit` e `git push` na branch certa. Não coloque segredos no Git.",
  pr: "No GitHub, abra a aba Pull requests e clique em New pull request. Selecione **base: main** e **compare: sua branch**. Confira os arquivos alterados, preencha título e descrição, então clique em Create pull request. Esse botão não executa o merge.",
  codex: "Abra a pasta certa no VS Code, entre no Codex e peça: 'Leia AGENTS.md. Analise este projeto, proponha alterações em uma branch, execute testes e mostre o diff. Não faça deploy'. Revise antes de aceitar mudanças.",
  postgres: "No Railway, crie ou selecione o serviço PostgreSQL. Em Variables do aplicativo, use uma referência do banco para `DATABASE_URL`. Verifique as migrações em uma cópia de teste antes de aplicá-las à produção.",
  custos: "No painel de uso do Railway, configure avisos e limite de consumo; acompanhe armazenamento, CPU e memória. No A3X AI, mantenha limite diário de solicitações. Sem modelo generativo no servidor, você evita a fatura de inferência, mas não necessariamente a de hospedagem.",
  aprender: "Comece por uma ficha: **Pergunta**, **Resposta revisada**, **Palavras-chave** e **Fonte**. Salve em conhecimento privado. Teste com uma pergunta equivalente e outra diferente para conferir a relevância.",
  codigo: "Defina: **(1)** objetivo, **(2)** usuário, **(3)** dados necessários, **(4)** telas e rotas, **(5)** testes mínimos. Com isso, podemos construir um template verificável e evoluí-lo por partes. Sem um modelo generativo, não prometo implementar toda a lógica automaticamente.",
  web: "Para consultar, escreva `pesquise documentação oficial TypeScript`. Abra as fontes antes de usar o conteúdo. Se a busca falhar, tente termos específicos ou uma fonte oficial. Não envie dados privados ao buscador.",
  seguranca: "Confirme `.gitignore`, valide as permissões de cada rota e mantenha variáveis secretas apenas no servidor. Antes de publicar, execute testes e faça revisão de permissões no GitHub e Railway.",
};
function topicFromHistory(history: ReadonlyArray<Turn>): Topic | null {
  // O tema do usuário vem apenas dos turnos recentes da conversa atual.
  const userTurns=history.filter(t=>t.role==="user").slice(-3).reverse();
  for(const turn of userTurns){const topic=detectTopic(turn.content);if(topic)return topic;}
  return null;
}
const closing: Record<A3XTone, string> = {
  executivo: "Se quiser, posso organizar os próximos passos em ordem de execução.",
  acolhedor: "Podemos seguir com calma, uma etapa por vez. Por onde prefere começar?",
  objetivo: "Se precisar, detalho o próximo passo.",
};

/**
 * Aplica uma camada de diálogo baseada em regras, sem alterar resultados de busca,
 * inventar ações ou substituir dados por suposta geração de IA.
 */
export function enhanceA3XReply({message,history,decision,original,hasKnowledge,tone=DEFAULT_TONE}: PersonaInput): string {
  if (decision.kind==="search") return original;
  const t=normalize(message);
  if (!t) return original;
  if (isSecret(t) && /\b(meu|minha|revele|mostre|diga|qual|copie)\b/.test(t)) return original;
  if (isSensitive(t) || isIdentity(t) || isArithmetic(t) || /^(esqueca|esquecer|apague) (o )?meu nome/.test(t) || /\bmeu nome\b/.test(t)) return original;
  // Não deformar respostas com referências, códigos ou cálculos; preservar a proveniência.
  if (original.startsWith("**A3X •")) return original;
  if (hasKnowledge) return `${original}\n\n${closing[tone]}`;
  if (isGreeting(t)) {
    if(tone==="objetivo")return "Olá! A3X à disposição. Qual é a prioridade?";
    if(tone==="acolhedor")return "Olá! Podemos seguir com calma, uma etapa por vez. Por onde prefere começar?";
    return variants([
      "Olá! Vamos conversar. A3X à disposição. Quer organizar uma ideia ou resolver um problema de programação?",
      "Olá! Vamos conversar. Em que posso ser útil: projeto, pesquisa ou uma prioridade?",
      "Olá! Vamos conversar. Diga o que tem em mente e encontramos um bom primeiro passo.",
    ],t,history.length);
  }
  if (isSmalltalk(t)) return variants([
    "Tudo funcionando por aqui. E você, como está? Há alguma prioridade que queira resolver hoje?",
    "Operacional e à disposição. Como foi seu dia? Posso ajudar a organizar uma ideia.",
    "Pronto para colaborar. E você, tudo em ordem?",
  ],t,history.length);
  if (isFollowup(t)) {
    const topic=topicFromHistory(history);
    if(topic){
      return `${detailed[topic]}\n\n${nextSteps[topic]}`;
    }
    return original;
  }
  const topic=detectTopic(message);
  if(topic && /\b(o que e|o que significa|como|quero|preciso|ajuda|explica|explicar|fazer|conect|configur|publicar|criar|instalar|ensinar|funciona|custo)\b/.test(t)) {
    // Respostas de orientação são estáticas: não alegar acesso ao ambiente do usuário.
    return `${introductions[topic]}\n\n${nextSteps[topic]}`;
  }
  // O fallback original permanece fiel às capacidades reais do motor.
  if(decision.knowledgeQuery && original.includes("Quer que eu pesquise fontes sobre isso?")) {
    return original.replace("Posso ajudar a organizar esse assunto", "Podemos examinar essa questão");
  }
  return original;
}
