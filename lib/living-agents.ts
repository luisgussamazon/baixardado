import type {DotAgent,DotTask} from "./dot-policy";

export type Rect={x:number;y:number;width:number;height:number};
export type Point={x:number;y:number};
export type LivingState="idle"|"exploring"|"observing"|"thinking"|"speaking"|"working"|"resting";
export const AGENT_NAMES={pipo:"Pipo",nino:"Nino",bubu:"Bubu",mimo:"Mimo"};
export const AGENT_RHYTHM={pipo:4800,nino:6500,bubu:3500,mimo:8000};
export function taskStatusLabel(status:string){return ({queued:"Na fila",running:"Em execução",failed:"Interrompida",completed:"Concluída",review:"Em revisão",paused:"Pausada",cancelled:"Cancelada"} as Record<string,string>)[status]??"Estado indisponível";}
export function taskStageLabel(stage:string){return ({pending:"Aguardando",architect:"Investigação",coder:"Proposta",security:"Políticas",tester:"Verificações",optimizer:"Comparação",evolution:"Registro"} as Record<string,string>)[stage]??"Etapa indisponível";}
export function overlaps(a:Rect,b:Rect,gap=10){return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;}
export function safePosition(point:Point,size:number,viewport:Point,blocked:Rect[]){return point.x>=12&&point.y>=76&&point.x+size<=viewport.x-12&&point.y+size<=viewport.y-16&&!blocked.some(r=>overlaps({...point,width:size,height:size},r));}
/** Bounded search: no hidden DOM, no network, no inference. A null destination means dock. */
export function agentDestination(agent:DotAgent,size:number,viewport:Point,blocked:Rect[],random= Math.random):Point|null{
 const candidates:Point[]=[];
 for(let y=88;y+size<=viewport.y-16;y+=48)for(let x=12;x+size<=viewport.x-12;x+=48)if(safePosition({x,y},size,viewport,blocked))candidates.push({x,y});
 if(!candidates.length)return null;
 // Role-biased regions, with variation on each decision rather than a fixed path.
 const ideal={pipo:{x:viewport.x*.83,y:viewport.y*.68},nino:{x:viewport.x*.84,y:viewport.y*.4},bubu:{x:viewport.x*.85,y:100},mimo:{x:viewport.x*.2,y:110}}[agent];
 candidates.sort((a,b)=>Math.hypot(a.x-ideal.x,a.y-ideal.y)-Math.hypot(b.x-ideal.x,b.y-ideal.y));
 return candidates[Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(.999,random()))*Math.min(8,candidates.length)))];
}
/** Conservative stepping prevents crossing a protected control en route to a safe destination. */
export function motionStep(from:Point,to:Point,size:number,viewport:Point,blocked:Rect[],elapsed:number):Point{
 const factor=1-Math.exp(-Math.max(0,Math.min(100,elapsed))/220),next={x:from.x+(to.x-from.x)*factor,y:from.y+(to.y-from.y)*factor};
 return safePosition(next,size,viewport,blocked)?next:from;
}
export function behaviorState(agent:DotAgent,tasks:DotTask[],busy:boolean,speaking:boolean,idleMs:number):LivingState{
 if(speaking)return "speaking";
 if(agent==="pipo"&&busy)return "thinking";
 if(tasks.some(t=>t.status==="running"&&(agent==="pipo"||agent==="nino"&&["architect","coder","security"].includes(t.stage)||agent==="bubu"&&["tester","optimizer"].includes(t.stage))))return "working";
 if(idleMs>120000)return "resting";
 return idleMs>18000?"exploring":idleMs>6000?"observing":"idle";
}
export function evidenceSpeech(agent:DotAgent,tasks:DotTask[],pendingMemory:number,busy=false){
 if(agent==="mimo")return pendingMemory>0?"Há conhecimento aguardando sua aprovação.":"Posso ajudar a organizar sua memória autorizada.";
 const active=tasks.find(t=>t.status==="running");
 if(agent==="bubu")return active&&["tester","optimizer"].includes(active.stage)?"As verificações estão em execução no runner.":tasks.some(t=>t.status==="review")?"Uma proposta aguarda revisão. Confira as verificações registradas.":"Ainda não há verificações em execução para apresentar.";
 if(agent==="nino")return active?.result?.hypothesis?"Há uma hipótese registrada. Quer conferir?":tasks.some(t=>t.status==="failed")?"Uma tarefa anterior foi interrompida. Quer conferir o diagnóstico?":"Posso preparar uma análise dos arquivos autorizados.";
 return busy?"Estou acompanhando sua resposta.":tasks.some(t=>t.status==="failed")?"Encontrei uma tarefa interrompida. Posso mostrar a evidência?":"Olá! O que vamos investigar ou construir?";
}
