import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {agentDestination,motionStep,overlaps,safePosition,behaviorState,evidenceSpeech} from "../lib/living-agents";
import {DOT_AGENTS} from "../lib/dot-policy";
import {ENGINEERING_PLAN_FORMAT,parseEngineeringPlan} from "../lib/engineering-plan-format";

test("living motion chooses safe destinations, avoids robots and never crosses controls",()=>{
 const viewport={x:1440,y:900},blocked=[{x:0,y:0,width:240,height:900},{x:300,y:180,width:800,height:520},{x:240,y:760,width:1200,height:140}],occupied=[...blocked];
 for(const agent of DOT_AGENTS){const p=agentDestination(agent,100,viewport,occupied,()=>.4);assert.ok(p);assert.ok(safePosition(p,100,viewport,occupied));assert.ok(!occupied.some(r=>overlaps({...p,width:100,height:100},r)));occupied.push({...p,width:100,height:100});}
 assert.equal(agentDestination("pipo",132,{x:300,y:200},[{x:0,y:0,width:300,height:200}]),null);
 const p={x:12,y:90},target={x:400,y:90},wall=[{x:120,y:0,width:40,height:500}];let next=p;for(let i=0;i<100;i++)next=motionStep(next,target,64,{x:800,y:600},wall,33);assert.ok(next.x+64<120);
 assert.deepEqual(motionStep(p,target,64,{x:800,y:600},[],0),p);
});
test("mobile movement and window shrinking fail closed rather than cover the composer",()=>{
 const viewport={x:390,y:844},blocked=[{x:0,y:260,width:390,height:584}];const p=agentDestination("pipo",64,viewport,blocked,()=>0);assert.ok(p);assert.ok(p.y+64<260);assert.equal(safePosition({x:350,y:100},64,viewport,[]),false);
});
test("behavior uses actual events, paid work is not invented for movement or speech",()=>{
 assert.equal(behaviorState("pipo",[],false,false,20000),"exploring");assert.equal(behaviorState("mimo",[],false,false,130000),"resting");assert.equal(behaviorState("pipo",[],true,false,0),"thinking");
 const task={id:"fixture",status:"running",stage:"tester",attempts:1,pr_number:null};assert.equal(behaviorState("bubu",[task],false,false,0),"working");assert.match(evidenceSpeech("bubu",[task],0),/em execução/);assert.match(evidenceSpeech("bubu",[],0),/não há verificações/);assert.doesNotMatch(evidenceSpeech("mimo",[],0),/Registrei|aprovado/);assert.match(evidenceSpeech("mimo",[],2),/aguardando/);
});
test("global provider is mounted once and motion cannot perform paid requests",async()=>{
 const layout=await readFile("app/layout.tsx","utf8"),workspace=await readFile("components/dot-workspace.tsx","utf8"),engine=await readFile("lib/living-agents.ts","utf8"),provider=await readFile("components/living-agents-provider.tsx","utf8");
 assert.equal((layout.match(/<LivingAgentsProvider/g)??[]).length,1);assert.match(layout,/key=\{user.id\}/);assert.doesNotMatch(workspace,/<ChatX|compact|setInterval/);assert.doesNotMatch(engine,/fetch\(|openai|reserveAIUsage/);assert.doesNotMatch(provider,/api\/chat|api\/engineering|openai.com/);assert.match(provider,/document.hidden/);assert.match(provider,/pointercancel/);assert.match(provider,/requestAnimationFrame/);
});
test("strict plan contract rejects malformed plans, extra fields and unauthorized paths without retry",()=>{
 assert.equal(ENGINEERING_PLAN_FORMAT.type,"json_schema");assert.equal(ENGINEERING_PLAN_FORMAT.strict,true);
 const p={path:"lib/knowledge-terms.ts",hypothesis:"Normalize terms",criterion:"Existing tests pass"};assert.deepEqual(parseEngineeringPlan(JSON.stringify(p),[p.path]),p);
 for(const value of ["```json\n{}\n```",JSON.stringify({...p,path:"../../.env"}),JSON.stringify({...p,command:"shell"}),JSON.stringify({...p,hypothesis:""}),"null","[]"]){assert.throws(()=>parseEngineeringPlan(value,[p.path]),/plano JSON/);}
});
