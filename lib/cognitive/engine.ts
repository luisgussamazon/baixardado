import { converse, type ConversationTurn } from "../local-conversation";
import { enhanceA3XReply } from "../a3x-personality";
import { interpret, normalize, containsPersonalData } from "./interpret";
import { initialState, type CognitiveDecision, type DialogueState, type MemoryRecord } from "./types";
import { creatorProfile,creatorQuestion,institutionQuestion } from "./creator";
import {A3X_ORIGIN} from "../brand";
const escape=(text:string)=>text.replace(/[\\`*_{}\[\]<>#!|]/g,"\\$&");
export function decide(message:string,history:ConversationTurn[],previous:DialogueState=initialState(),records:MemoryRecord[]=[],now=Date.now()):CognitiveDecision {
  const interpretation=interpret(message),text=normalize(message);
  const state:DialogueState=structuredClone(previous);
  state.turns=Math.min(state.turns+1,1_000_000);state.lastIntent=interpretation.intent;
  if(interpretation.entities.topic)state.topic=interpretation.entities.topic;
  const done=(reply:string,confidence:CognitiveDecision["confidence"]="alta",reason="regra explícita",protectedReply=true):CognitiveDecision=>({route:"local",text:reply,confidence,reason,state,interpretation,protected:protectedReply});
  const approved=records.filter(r=>r.status==="approved");
  if(state.pendingWeb&&state.pendingWeb.expires<=now)state.pendingWeb=null;
  if(text==="confirmo envio a web"){
    if(!state.pendingWeb)return done("Não há pesquisa pessoal pendente. Escreva pesquise seguido do assunto para iniciar.");
    const query=state.pendingWeb.query;state.pendingWeb=null;
    return {...done("","moderada","envio confirmado pelo usuário"),route:"web",query};
  }
  // Consentimento vale apenas para a pesquisa imediatamente pendente, não para futuras consultas.
  state.pendingWeb=null;
  const creator=creatorProfile(approved);
  if(institutionQuestion(message))return done(A3X_ORIGIN,"alta","identidade institucional definida pelos responsáveis pelo aplicativo");
  if(creatorQuestion(message))return done(creator?
    `Reconheço o perfil privado aprovado desta conta: **${escape(creator.name)}**. ${A3X_ORIGIN} O modelo de linguagem utilizado é um componente de terceiros.\n\nPerfil privado aprovado por você · Registro: ${escape(creator.sourceId)}.`:
    "Ainda não há um perfil de criador aprovado e sem conflitos nesta conta. Em [Minha memória](/memoria), defina seu nome na seção Identidade do criador e aprove o perfil. Essa identificação não altera permissões.",creator?"alta":"baixa","perfil privado de criador, sem alteração de privilégios");
  if(interpretation.intent==="identity")return done("Sou a A3X IA, assistente tecnológico da A3X TECH. "+A3X_ORIGIN+" Uso o modelo configurado, memória autorizada e pesquisa sob pedido. Não sou humano nem consciente.");
  if(interpretation.intent==="memory"){
    if(/^(?:minhas preferencias|minha memoria|o que)/.test(text)){
      const facts=approved.filter(r=>r.kind==="fact"||r.kind==="preference");
      return done(facts.length?"**Memória autorizada por você (até 20 registros resumidos):**\n\n"+facts.slice(0,20).map(r=>`- ${escape(r.label)}: ${escape(r.value.slice(0,400))}`).join("\n")+"\n\nRevise ou exclua em [Minha memória](/memoria).":"Não há fatos ou preferências aprovados. Você pode propor e aprovar registros em [Minha memória](/memoria). O histórico de conversas continua separado.");
    }
    return done("Para guardar fatos, preferências ou correções, abra [Minha memória](/memoria), proponha o registro e aprove-o explicitamente. Nada desta mensagem foi aprendido automaticamente. Você também pode excluir registros nessa tela; isso não apaga mensagens do histórico.");
  }
  const askedLabel=text.match(/^qual (?:e )?(?:(?:o|a) )?(?:meu|minha) (.+?)[?!.]*$/)?.[1];
  const remembered=askedLabel&&approved.find(record=>(record.kind==="fact"||record.kind==="preference")&&normalize(record.label)===askedLabel);
  if(remembered)return done(`**${escape(remembered.label)}:** ${escape(remembered.value)}\n\nFonte: memória privada aprovada por você, registro ${escape(remembered.id)}. Revise em [Minha memória](/memoria).`,"moderada","rótulo exato de memória autorizada");
  if(interpretation.intent==="goal"){
    state.goal={title:interpretation.entities.goal!,phase:"planned",step:0,steps:["Definir um resultado verificável e os recursos disponíveis","Executar uma primeira tarefa pequena e registrar o resultado","Revisar o resultado e decidir o próximo ciclo"]};
    return done(`**Plano proposto:** ${escape(state.goal.title)}\n\n${state.goal.steps.map((s,i)=>`${i+1}. ${s}`).join("\n")}\n\n${interpretation.entities.deadline?`Prazo mencionado: ${escape(interpretation.entities.deadline)} (não agendado).\n\n`:""}Escreva **iniciar plano** para acompanhar a primeira etapa. Este é um roteiro por regras; nenhuma ação externa será executada.`);
  }
  if(interpretation.intent==="goal-action"){
    const goal=state.goal,action=interpretation.entities.action;
    if(!goal)return done("Não há plano nesta conversa. Escreva **planeje** seguido do objetivo.");
    if(action==="cancelar plano"&&goal.phase!=="completed")goal.phase="cancelled";
    else if(action==="iniciar plano"&&goal.phase==="planned")goal.phase="active";
    else if(action==="pausar plano"&&goal.phase==="active")goal.phase="paused";
    else if(action==="retomar plano"&&goal.phase==="paused")goal.phase="active";
    else if(action==="concluir etapa"&&goal.phase==="active"){
      goal.step++;if(goal.step>=goal.steps.length)goal.phase="completed";
    }
    const phase={planned:"proposto",active:"em andamento",paused:"pausado",completed:"concluído por sua confirmação",cancelled:"cancelado"}[goal.phase];
    return done(`**${escape(goal.title)}** — ${phase}.\n\n${goal.phase==="active"?`Etapa ${goal.step+1}: ${goal.steps[goal.step]}.\n\nQuando terminar, escreva **concluir etapa**. Você pode usar **pausar plano**.`:goal.phase==="paused"?"Escreva **retomar plano** quando quiser continuar.":goal.phase==="planned"?"Escreva **iniciar plano** para começar.":"Quer definir outro objetivo? Escreva **planeje** seguido da prioridade."}`);
  }
  if(interpretation.intent==="followup"&&state.goal?.phase==="active")return done(`Seu plano **${escape(state.goal.title)}** está na etapa ${state.goal.step+1}: ${state.goal.steps[state.goal.step]}. Qual resultado você já conseguiu? Use **concluir etapa** apenas quando tiver terminado.`);
  const correction=interpretation.intent!=="web"&&approved.find(r=>r.kind==="correction"&&r.question&&normalize(r.question)===text);
  if(correction)return done(`**Correção aprovada por você**\n\n${correction.value.split("\n").map(line=>"> "+escape(line)).join("\n")}\n\nFonte: seu registro privado ${escape(correction.id)}.`,"moderada","correspondência exata com correção aprovada");
  if(interpretation.intent!=="web"&&/^(qual|quais|quem|o que|quanto|como (esta|ficou)|me (diga|mostre)|quero saber)\b/.test(text)&&/\b(hoje|agora|atual|atuais|atualmente|ultimas noticias|cotacao|preco atual)\b/.test(text)){
    state.pendingWeb={query:message,expires:now+10*60_000};
    return done("Esta pergunta pede informações recentes. Para consultar fontes públicas sem inventar uma resposta, confirme o envio da sua pergunta ao buscador com **confirmo envio à web**. Revise e remova dados pessoais antes de confirmar.","baixa","precisa de fontes recentes");
  }
  const base=converse(message,history.map(turn=>({...turn,content:turn.content.replace(/\n\n_Confiança de correspondência:[\s\S]*$/,"")})));
  if(base.kind==="reply"&&/^(O resultado é|Não consegui calcular)/.test(base.text))return done(base.text,"alta","cálculo determinístico");
  if(base.kind==="search"){
    const warning=containsPersonalData(base.query,approved)?"Esta consulta pode conter dados pessoais. ":"";
    state.pendingWeb={query:base.query,expires:now+10*60_000};
    return done(warning+"A consulta ainda não foi enviada. Para autorizar o envio desta consulta ao buscador público, escreva **confirmo envio à web**. Qualquer outra mensagem cancela a pendência. Revise sua mensagem e prefira pesquisar sem dados pessoais.");
  }
  let tone:"executivo"|"acolhedor"|"objetivo"="executivo";
  const preference=approved.find(r=>r.kind==="preference"&&normalize(r.label)==="tom");
  if(preference&&["executivo","acolhedor","objetivo"].includes(preference.value))tone=preference.value as typeof tone;
  let original=enhanceA3XReply({message,history,decision:base,original:base.text,hasKnowledge:base.text.startsWith("**A3X •"),tone});
  if(creator&&/^(oi|ola|bom dia|boa tarde|boa noite|fala comigo|conversa comigo)[!?. ]*$/.test(text))original=original.replace(/^Olá[!,.]?/,`Olá, ${escape(creator.name)}!`);
  const unknown=!!base.knowledgeQuery&&original.includes("Quer que eu pesquise fontes sobre isso?");
  return {...done(original,unknown?"baixa":"moderada",unknown?"nenhuma correspondência local confiável":"correspondência em regras editoriais",false),route:unknown?"unknown":"knowledge",query:base.knowledgeQuery??message};
}
export function confidenceNote(confidence:CognitiveDecision["confidence"],reason:string){
  return `\n\n_Confiança de correspondência: ${confidence} — ${reason}. Indicador por regras, não probabilidade de veracidade._`;
}
