import type {DotAgent,DotTask} from "./dot-policy";
import {failureDiagnostic} from "./dot-diagnostics";
import {taskStageLabel} from "./living-agents";
import {A3X_ORIGIN} from "./brand";
export type CommunicationTask=DotTask&{goal?:string;run_id?:string|null};
export type CommunicationContext={tasks:CommunicationTask[];memory:{approved:number;pending:number};settings:{enabled:boolean;luna_enabled:boolean;quiet?:boolean};cloudConsent?:boolean;configured?:boolean;globalPaused:boolean};
export type AgentNotice={id:string;serverId?:string;agent:DotAgent;text:string;href:string;label:string;priority:number;taskId?:string;investigable?:boolean};
export type Finding={id:string;task_id:string|null;kind:string;message:string;code:string};
const taskHref="/central/projetos";
export function taskBrief(task:CommunicationTask){
 if(task.status==="failed"){const d=failureDiagnostic(task.result?.failureCode);return `${d.summary} ${d.next}`;}
 if(task.status==="queued")return "A tarefa está registrada e aguarda disponibilidade do runner GitHub. Ainda não começou a executar.";
 if(task.status==="paused")return "A tarefa está pausada. Confira os eventos na Central antes de retomá-la.";
 if(task.status==="cancelled")return "A tarefa foi cancelada. Nenhuma nova execução será iniciada por esta tarefa.";
 if(task.status==="review")return "A proposta está em revisão. Confira o diff e as verificações antes de aprovar; ela ainda não foi integrada à produção.";
 if(task.status==="completed")return "A tarefa foi concluída. O resultado está registrado; consulte-o para saber quais verificações ocorreram.";
 if(task.status==="running")return `A tarefa está em execução, na etapa de ${taskStageLabel(task.stage).toLocaleLowerCase("pt-BR")}.`;
 return "Não tenho um estado confirmado para esta tarefa.";
}
export function assistantOverview(agent:DotAgent,c:CommunicationContext){
 const task=c.tasks.find(t=>t.status==="running")??c.tasks.find(t=>t.status==="review")??c.tasks.find(t=>t.status==="failed")??c.tasks[0];
 if(agent==="mimo")return c.memory.pending?`Há ${c.memory.pending} registro(s) de memória aguardando sua aprovação. Posso mostrar onde revisar.`:`Você tem ${c.memory.approved} registro(s) de memória aprovado(s). O que quer organizar?`;
 if(!task)return {pipo:"Olá! Posso ajudar a conversar, organizar um objetivo ou preparar uma investigação. Por onde começamos?",nino:"Posso ajudar a definir uma hipótese e um critério de verificação para o código autorizado. Qual problema você quer investigar?",bubu:"Não há tarefas registradas para verificar agora. Posso explicar como acompanhar uma execução."}[agent];
 if(agent==="nino"&&task.result?.hypothesis)return `Hipótese registrada: ${task.result.hypothesis} ${task.result.criterion?"Critério: "+task.result.criterion:""}`;
 return taskBrief(task);
}
/** Answers only questions supported by the snapshot. Unknown requests stay drafts, never paid calls. */
export function assistantReply(agent:DotAgent,question:string,c:CommunicationContext){
 const q=question.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 if(!q||question.length>4000||/^(execute|rode|inicie|cancele|pause|publique|altere|apague|investigue|melhore)\b/.test(q))return null;
 if(/^(oi|ola|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|fala comigo)(?:[,!.\s]+tudo bem)?[!.?\s]*$/.test(q))return {text:agent==="pipo"?"Olá! Estou por aqui. Quer conversar ou acompanhar uma tarefa?":"Olá! Vamos cuidar disso juntos. O que você precisa?",href:"/chat-x",label:"Abrir Chat"};
 if(/(?:quem (?:criou|fundou) (?:voce|a3x(?: ia| ai| tech)?)[?!.\s]*$|quem (?:e|sao) (?:o|os) criador(?:es)?(?: (?:da|do|de) (?:a3x|voce))?[?!.\s]*$|de quem e a a3x)/.test(q))return {text:A3X_ORIGIN,href:"/chat-x",label:"Abrir Chat"};
 if(/(?:orcamento|quanto custa.*(?:luna|api|a3x|investiga)|limite de gasto|custo da luna)/.test(q))return {text:"As investigações compartilham o teto interno de US$5 por mês com o Chat. Cada investigação automática tem até cinco chamadas e US$0,03 de reservas acumuladas. Movimentos e avisos locais não usam a API. O teto interno não garante a fatura externa.",href:"/chat-x",label:"Ver preferências"};
 if(/(?:sua autonomia|autonomia (?:esta|do a3x|dos agentes)|como esta (?:a )?autonomia|^autonomia[?!.\s]*$|esta ativ|esta paus|pode trabalhar sozinh)/.test(q)){const text=c.globalPaused||!c.settings.enabled?"A observação autônoma está pausada.":!c.configured?"A observação está ativa. A Luna ainda não está configurada no servidor.":!c.settings.luna_enabled||!c.cloudConsent?"A observação está ativa. Para investigar código com a Luna, autorize as investigações nas preferências e no seletor de modelo.":"As investigações com Luna estão autorizadas nesta conta, sujeitas ao orçamento, à frequência e ao escopo permitido. Propostas seguem para revisão; não há merge ou deploy automático.";return {text,href:"/chat-x",label:"Ver preferências"};}
 if(/(?:minha memoria|memoria (?:aprovada|da conta)|memorias|aprendeu|aprendizado|conhecimento (?:aprovado|aguardando)|^(?:memoria|o que esta na memoria|como esta a memoria)[?!.\s]*$)/.test(q))return {text:`Há ${c.memory.approved} registro(s) aprovado(s) e ${c.memory.pending} aguardando aprovação. Posso mostrar a memória para você revisar. Isso não altera os pesos do modelo.`,href:"/memoria",label:"Revisar memória"};
 if(/(?:status|andamento|progresso|o que (?:esta|estao) fazendo|falh|interromp|proxim[oa] passo|resultado.*(?:tarefa|teste|verifica|investiga)|testes|hipotese|proposta|fila)/.test(q))return {text:assistantOverview(agent,c),href:taskHref,label:"Ver tarefa e evidências"};
 return null;
}
export function agentNotices(c:CommunicationContext,findings:Finding[]):AgentNotice[]{
 const notices:AgentNotice[]=[];
 for(const f of findings){const task=c.tasks.find(t=>t.id===f.task_id);let agent:DotAgent="pipo",priority=30,text=f.message,href=taskHref,label="Ver evidências",investigable=false;
  if(f.kind==="memory"){if(!c.memory.pending)continue;agent="mimo";priority=60;text=`Há ${c.memory.pending} registro(s) aguardando aprovação. Quer revisar sua memória?`;href="/memoria";label="Revisar memória";}
  else if(!task)continue;
  else if(f.kind==="review"&&task.status==="review"){agent="nino";priority=100;text=taskBrief(task);label="Revisar proposta";if(Number.isSafeInteger(task.pr_number)&&Number(task.pr_number)>0)href=`https://github.com/luisgussamazon/baixardado/pull/${task.pr_number}`;}
  else if(f.kind==="failure"&&task.status==="failed"){const d=failureDiagnostic(task.result?.failureCode??f.code);agent=d.investigable?"nino":"pipo";priority=80;text=`${d.summary} ${d.next}`;investigable=d.investigable;}
  else if(f.kind==="queued"&&task.status==="queued"){priority=40;text=taskBrief(task);}
  else if(f.kind==="completed"&&task.status==="completed"){agent="bubu";text=taskBrief(task);}
  else continue;
  notices.push({id:f.id,serverId:f.id,agent,text,href,label,priority,taskId:task?.id,investigable});
 }
 for(const t of c.tasks.filter(t=>t.status==="running")){const testing=["tester","optimizer"].includes(t.stage);notices.push({id:`stage:${t.id}:${t.stage}`,agent:testing?"bubu":"nino",text:taskBrief(t),href:taskHref,label:"Acompanhar execução",priority:75,taskId:t.id});}
 return notices.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
