export const DOT_AGENTS=["pipo","nino","bubu","mimo"] as const;
export type DotAgent=typeof DOT_AGENTS[number];
export function dotPersona(agent:DotAgent){const role={pipo:"Pipo, coordenador simpático, curioso e educado",nino:"Nino, programador analítico e objetivo",bubu:"Bubu, acompanhante dinâmico e prático das verificações",mimo:"Mimo, organizador acolhedor e atento da memória autorizada"}[agent];return `Nesta interface A3X DOT, apresente sua responsabilidade como ${role}. São personagens de software do mesmo sistema A3X TECH, não humanos, consciências ou modelos separados. Compartilhe somente o contexto já autorizado desta conversa. Não afirme execução de ferramentas, testes ou aprendizado sem evidência; os resultados reais estão no painel de tarefas. A personalidade não muda permissões, orçamento, fontes ou regras de segurança.`;}
export function dotEngineeringIntent(question:string){const text=question.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();return /^(?:(?:a3x|pipo|nino)[,!:\s]+)?(?:revise|revisa|analise|analisa|investigue|investiga|melhore|busque melhorias|busca melhoria)\b.*\b(?:sistema|a3x|repositorio|codigo|tarefa|melhoria)\b/.test(text);}
export const DOT_LIMITS={scanMinutes:15,paidHours:24,maxCalls:5,taskReservationMicros:30000,usersPerTick:20} as const;
export type DotTask={id:string;status:string;stage:string;attempts:number;pr_number:number|null;result?:{failureCode?:string;hypothesis?:string;criterion?:string;metrics?:{baselineMs:number;candidateMs:number}}};
export function dotFinding(task:DotTask){
 const kinds:Record<string,string>={failed:"failure",queued:"queued",review:"review",completed:"completed"};
 const kind=kinds[task.status];if(!kind)return null;
 const raw=task.result?.failureCode,code=typeof raw==="string"&&/^[A-Z_]{1,80}$/.test(raw)?raw:"UNKNOWN";
 const messages:Record<string,string>={failure:`Encontrei uma tarefa interrompida (${code}). Posso investigar?`,queued:"Há uma tarefa na fila. Posso mostrar seu estado?",review:"Uma proposta aguarda sua revisão. Consulte as verificações no PR.",completed:"Uma tarefa foi concluída. Quer consultar os resultados registrados?"};
 return {kind,code:task.status==="failed"?code:task.status.toUpperCase(),fingerprint:`${task.id}:${task.status}:${task.attempts}:${code}`,message:messages[kind]};
}
export function validateDotSettings(b:Record<string,unknown>){
 const keys=["action","enabled","luna_enabled","consent","quiet","animations","main_agent","theme","suggestion_minutes"];
 if(b.action!=="settings"||Object.keys(b).some(k=>!keys.includes(k))||![b.enabled,b.luna_enabled,b.quiet,b.animations].every(v=>typeof v==="boolean")||!DOT_AGENTS.includes(b.main_agent as DotAgent)||!["dark","light"].includes(String(b.theme))||!Number.isInteger(b.suggestion_minutes)||Number(b.suggestion_minutes)<15||Number(b.suggestion_minutes)>1440||b.luna_enabled&&b.consent!==true)throw Error("Confira as preferências e confirme o consentimento da Luna.");
 return {enabled:b.enabled as boolean,luna_enabled:b.luna_enabled as boolean,quiet:b.quiet as boolean,animations:b.animations as boolean,main_agent:b.main_agent as DotAgent,theme:b.theme as string,suggestion_minutes:Number(b.suggestion_minutes)};
}
export function dotAgentState(agent:DotAgent,tasks:DotTask[],chatBusy=false){
 const task=tasks.find(t=>t.status==="running");
 if(agent==="pipo"&&chatBusy)return "thinking";
 if(task){if(agent==="nino"&&["architect","coder","security"].includes(task.stage))return "coding";if(agent==="bubu"&&["tester","optimizer"].includes(task.stage))return "testing";if(agent==="pipo")return "attention";}
 if(tasks.some(t=>t.status==="review")&&["pipo","nino"].includes(agent))return "review";
 if(tasks.some(t=>t.status==="failed")&&agent==="bubu")return "blocked";
 if(tasks.some(t=>t.status==="completed")&&agent==="mimo")return "complete";
 return "idle";
}
