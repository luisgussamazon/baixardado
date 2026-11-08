export type ConversationTurn = {role:"user"|"assistant";content:string};
export type ConversationDecision = {kind:"reply";text:string;knowledgeQuery?:string}|{kind:"search";query:string};
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const quote=(value:string)=>value.slice(0,120).replace(/[\\`*_{}\[\]<>#!|]/g,"\\$&");

function givenName(text:string):string|undefined {
  const match=text.trim().match(/^(?:meu nome (?:é|e)|me chamo|pode me chamar de)\s+([\p{L}][\p{L}\p{M}' -]{1,49})(?:[.!?]|$)/iu);
  return match?.[1].split(/\s+(?:e|mas|quero)\s+/i)[0].trim().split(/\s+/).slice(0,4).join(" ");
}

// Parser aritmético limitado; nunca usa eval, Function ou execução de código.
export function calculate(expression:string):number|null {
  const source=expression.replace(/,/g,".").replace(/\s/g,"");
  if(!source||source.length>120||!/^[0-9.+*/()\-]+$/.test(source))return null;
  const tokens=source.match(/\d+(?:\.\d+)?|[()+*/-]/g)??[];
  if(tokens.join("")!==source||tokens.length>80)return null;
  let position=0;
  function atom():number {
    const token=tokens[position++];
    if(token==="+")return atom();
    if(token==="-")return -atom();
    if(token==="("){const result=sum();if(tokens[position++]!==")")throw new Error();return result;}
    if(!token||!/^\d/.test(token))throw new Error();return Number(token);
  }
  function product():number {let value=atom();while(["*","/"].includes(tokens[position])){const op=tokens[position++],right=atom();value=op==="*"?value*right:value/right;}return value;}
  function sum():number {let value=product();while(["+","-"].includes(tokens[position])){const op=tokens[position++],right=product();value=op==="+"?value+right:value-right;}return value;}
  try {const value=sum();return position===tokens.length&&Number.isFinite(value)?Number(value.toPrecision(12)):null;}catch{return null;}
}

export function converse(message:string,history:ConversationTurn[]=[]):ConversationDecision {
  const text=normalize(message),turns=history.slice(-24);
  let name:string|undefined;
  for(const turn of turns){
    if(turn.role!=="user")continue;
    if(/^(esqueca|esquecer|apague) (o )?meu nome[.!]?$/.test(normalize(turn.content)))name=undefined;
    else name=givenName(turn.content)??name;
  }
  const reply=(answer:string):ConversationDecision=>({kind:"reply",text:answer});
  const lastAssistant=[...turns].reverse().find(t=>t.role==="assistant")?.content??"";
  const lastUser=[...turns].reverse().find(t=>t.role==="user")?.content??"";
  const named=name?`, ${quote(name)}`:"";

  if(/^(esqueca|esquecer|apague) (o )?meu nome[.!]?$/.test(text))
    return reply("Certo. Não vou usar seu nome nas próximas respostas desta conversa. A mensagem original continua no histórico; para removê-la do armazenamento, exclua a conversa.");
  const introduced=givenName(message);
  if(introduced)return reply(`Prazer, ${quote(introduced)}. Posso usar esse nome enquanto ele estiver no contexto recente desta conversa. O que você gostaria de fazer hoje?`);
  if(/\b(qual (e )?(o )?meu nome|lembra (do )?meu nome|como (eu )?me chamo)\b/.test(text))
    return reply(name?`Você me disse que seu nome é ${quote(name)}.`:"Você ainda não me disse seu nome no contexto recente desta conversa. Como posso chamar você?");
  if(/^(nao|não) (pesquise|busque)/.test(text))return reply("Certo. Vamos continuar por aqui, sem enviar essa mensagem a um buscador. Sobre o que você quer conversar?");
  const search=message.trim().match(/^(?:pesquise|pesquisa|busque|buscar|procure|consultar|busca na web)\s+(?:sobre\s+)?([\s\S]+)$/i);
  if(search)return {kind:"search",query:search[1].trim().slice(0,4000)};
  if(/^(sim|pode|pode pesquisar|pesquise|busque)[.!]?$/.test(text)&&lastAssistant.endsWith("Quer que eu pesquise fontes sobre isso?"))
    return {kind:"search",query:lastUser.slice(0,4000)};
  if(/^(nao|agora nao|prefiro conversar)[.!]?$/.test(text)&&lastAssistant.endsWith("Quer que eu pesquise fontes sobre isso?"))
    return reply("Tudo bem. Sem pesquisa. Você quer organizar uma ideia, falar sobre seu dia ou montar um plano?");
  const expression=text.replace(/^(quanto (e|da)|calcule|calcular|conta)\s*[:=]?\s*/,"").replace(/[?=]$/,"");
  if(/^[\d(+-]/.test(expression)&&/[+*/-]/.test(expression)){
    const value=calculate(expression);
    return reply(value===null?"Não consegui calcular essa expressão. Use números, parênteses e os operadores +, -, * e /. Divisão por zero não é válida.":`O resultado é **${value.toLocaleString("pt-BR",{maximumFractionDigits:12})}**.`);
  }
  if(/\b(quem e voce|o que voce e|como voce funciona|voce e uma ia|voce pensa|tem sentimentos|e consciente)\b/.test(text))
    return reply("Sou o A3X, um assistente com motor de conversa escrito neste aplicativo. Uso regras, cálculos e o contexto recente para responder. Não tenho consciência, sentimentos ou um modelo de linguagem. Posso conversar dentro dessas funções e pesquisar fontes quando você pedir.");
  if(/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|fala comigo|conversa comigo|vamos conversar|quero conversar|oi tudo bem)[!?. ]*$/.test(text))
    return reply(`Olá${named}! Vamos conversar. Você prefere me contar como foi seu dia ou falar sobre algo que quer construir?`);
  if(/^(tudo bem|como vai|como voce esta|voce esta bem)[?!. ]*$/.test(text))
    return reply(`Estou funcionando e pronto para conversar${named}. E você, como está hoje?`);
  if(/^(quero falar|vamos falar|quero conversar|falar) (sobre |do |de )?(meu )?dia[!.? ]*$/.test(text))
    return reply(`Como foi seu dia${named}? Aconteceu algo que você quer dividir ou organizar melhor?`);
  if(/\b(estou|to|me sinto) (triste|cansad[oa]|ansios[oa]|desanimad[oa]|preocupad[oa])\b/.test(text))
    return reply(`Você está passando por um momento difícil${named}. Quer me contar o que aconteceu ou prefere organizar uma pequena ação para hoje? Posso escutar o que escrever, mas não substituo apoio humano ou profissional.`);
  if(/^(estou bem|to bem|estou feliz|tudo otimo|bem e voce)[!.? ]*$/.test(text))
    return reply(`Que bom${named}. Tem alguma ideia que você quer tirar do papel hoje?`);
  if(/\b(dia|hoje|foi|trabalhei|aconteceu)\b/.test(text)&&/como foi seu dia|como está hoje/.test(lastAssistant.toLowerCase()))
    return reply(`Me conte qual foi a parte mais marcante${named}. Você quer só conversar sobre isso ou pensar em um próximo passo?`);
  const interest=message.trim().match(/^(?:eu )?gosto (?:muito )?de\s+([\s\S]+)$/i);
  if(interest)return reply(`Podemos falar de **${quote(interest[1])}**${named}. O que mais chama sua atenção nesse assunto?`);
  if(/\b(obrigad[oa]|valeu|agradeco)\b/.test(text)&&text.length<100)return reply(`Por nada${named}. Quer continuar no mesmo assunto ou começar outro?`);
  if(/^(tchau|ate mais|ate logo|boa noite vou dormir)[!. ]*$/.test(text))return reply(`Até mais${named}. Suas conversas ficam no seu histórico para você retomar depois.`);
  if(/\b(o que (voce )?(consegue|pode) fazer|me ajude|preciso de ajuda|ajuda|suas funcoes)\b/.test(text)&&text.length<140)
    return reply("Posso conversar por intenções, usar seu nome no contexto recente, organizar um objetivo em passos e fazer contas simples. Para consultar informações externas, escreva **pesquise** seguido do assunto. No Programador, você encontra pesquisa técnica e um template de arquivos; não gero sistemas completos sem um modelo.");
  const goal=message.trim().match(/^(?:quero|preciso|gostaria de)\s+(aprender|estudar|criar|construir|organizar|planejar)\s+([\s\S]+)$/i);
  if(goal){
    const subject=quote(goal[2]);
    return reply(`Vamos trabalhar em **${subject}**${named}.\n\nPodemos começar definindo o resultado, escolher uma primeira tarefa pequena e conferir o que falta.\n\nVocê está começando do zero ou já tem alguma coisa pronta?`);
  }
  if(/^(do zero|estou comecando|comecando do zero|nao tenho nada)[.!]?$/.test(text)&&lastAssistant.includes("começando do zero"))
    return reply("Então vamos reduzir o primeiro passo: qual é o resultado mais simples que você quer conseguir e quanto tempo tem disponível? Uma frase para cada um já ajuda.");
  if(/^(ja tenho|tenho algo|ja comecei)/.test(text)&&lastAssistant.includes("começando do zero"))
    return reply("Me conte o que já está pronto e qual é o principal obstáculo. Podemos separar o próximo passo do que pode ficar para depois.");
  if(/^(sim|nao|talvez|pode ser)[.!]?$/.test(text))return reply("Me dê um pouco mais de contexto: a qual parte da nossa conversa você está se referindo?");
  if(text.length<3)return reply("Pode me contar um pouco mais? Uma frase já ajuda a escolher como continuar.");
  return {kind:"reply",knowledgeQuery:message,text:`Posso ajudar a organizar esse assunto${named}, mas meu motor local ainda não tem uma resposta específica para ele. Você quer explicar melhor o que precisa ou consultar informações externas?\n\nQuer que eu pesquise fontes sobre isso?`};
}
