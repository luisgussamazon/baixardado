import {test} from "node:test";
import assert from "node:assert/strict";
import {agentNotices,assistantOverview,assistantReply,taskBrief,type CommunicationContext} from "../lib/agent-communication";
import {failureDiagnostic,INVESTIGABLE_FAILURES} from "../lib/dot-diagnostics";
const context:CommunicationContext={tasks:[],memory:{approved:3,pending:2},settings:{enabled:true,luna_enabled:false},configured:true,cloudConsent:false,globalPaused:false};
const task={id:"task",status:"failed",stage:"evolution",attempts:1,pr_number:null,result:{failureCode:"PLAN_FORMAT"}};

test("diagnostics distinguish code investigations from access, budget and uncertain provider failures",()=>{
 for(const code of INVESTIGABLE_FAILURES)assert.equal(failureDiagnostic(code).investigable,true);
 for(const code of ["AI_AUTH","LOCAL_BUDGET","AI_LIMIT","AI_TIMEOUT","AI_CONSENT","DOT_PAUSED","ENGINEERING_UNKNOWN","arbitrary private text"]){assert.equal(failureDiagnostic(code).investigable,false);assert.ok(failureDiagnostic(code).next);}
 assert.match(failureDiagnostic("AI_AUTH").next,/Não a envie/);assert.equal(failureDiagnostic("private@example.test").code,"UNKNOWN");
});
test("mini assistants answer from current evidence and explain why they are waiting",()=>{
 assert.match(assistantReply("pipo","Oi, tudo bem?",context)!.text,/Olá/);assert.match(assistantReply("pipo","Quem criou você?",context)!.text,/A3X TECH.*Luis Gustavo.*Samuel Moraes/);
 assert.match(assistantReply("pipo","Qual o status?",{...context,tasks:[{...task,status:"queued"}]})!.text,/aguarda.*runner/);
 assert.match(assistantReply("nino","Por que falhou?",{...context,tasks:[task]})!.text,/formato inválido/);
 assert.match(assistantReply("mimo","O que está na memória?",context)!.text,/3.*2/);
 assert.match(assistantReply("pipo","Autonomia está ativa?",context)!.text,/autorize/);
 assert.match(assistantReply("pipo","Autonomia está ativa?",{...context,globalPaused:true})!.text,/pausada/);
 assert.match(assistantReply("pipo","Autonomia está ativa?",{...context,settings:{enabled:true,luna_enabled:true},cloudConsent:true})!.text,/autorizadas.*orçamento/);
 assert.match(assistantReply("bubu","Quanto custa a Luna?",context)!.text,/US\$5.*cinco chamadas/);
});
test("commands and unrelated questions remain explicit Chat drafts rather than invented local answers",()=>{
 for(const q of ["Explique TypeScript","Por que o céu é azul?","Execute testes agora","Publique a proposta","Investigue meu sistema","Quem criou Linux?","Quanto custa uma viagem?","O que é memória RAM?","Qual o resultado de 2+2?"]){assert.equal(assistantReply("pipo",q,context),null);}
 assert.doesNotMatch(assistantOverview("bubu",context),/passaram|em execução/);assert.doesNotMatch(taskBrief({...task,status:"completed"}),/testes passaram|aprendi|melhorou/);
});
test("notices prioritize review, reject stale states and link only existing evidence",()=>{
 const review={...task,id:"review",status:"review",pr_number:31},queued={...task,id:"queued",status:"queued"};
 const findings=[{id:"queue",task_id:"queued",kind:"queued",message:"untrusted",code:"QUEUED"},{id:"pr",task_id:"review",kind:"review",message:"untrusted",code:"REVIEW"},{id:"stale",task_id:"review",kind:"failure",message:"old failure",code:"PLAN_FORMAT"},{id:"foreign",task_id:"other",kind:"failure",message:"other owner",code:"PLAN_FORMAT"}];
 const notices=agentNotices({...context,tasks:[review,queued]},findings);assert.equal(notices[0].id,"pr");assert.equal(notices[0].href,"https://github.com/luisgussamazon/baixardado/pull/31");assert.equal(notices.length,2);assert.doesNotMatch(JSON.stringify(notices),/old failure|other owner|untrusted/);
 const live=agentNotices({...context,tasks:[{...task,status:"running",stage:"tester"}]},[]);assert.equal(live[0].agent,"bubu");assert.equal(live[0].serverId,undefined);assert.match(live[0].text,/verificações/);
});
