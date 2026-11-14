import assert from "node:assert/strict";
import {AsyncLocalStorage} from "node:async_hooks";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {before,after,beforeEach,afterEach,test,mock} from "node:test";
import {PGlite} from "@electric-sql/pglite";
let pg:PGlite,db:typeof import("../lib/db").db,provider:typeof import("../lib/ai-provider"),luna:typeof import("../lib/openai-luna"),api:typeof import("../app/api/ai/provider/route"),model:typeof import("../lib/local-model");
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage,work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage,Cookies:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
const users=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"];
async function query(sql:string,params?:unknown[]){const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}
before(async()=>{
 Object.assign(globalThis,{AsyncLocalStorage});({db}=await import("../lib/db"));provider=await import("../lib/ai-provider");luna=await import("../lib/openai-luna");api=await import("../app/api/ai/provider/route");model=await import("../lib/local-model");
 ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));({ResponseCookies:Cookies}=await import("next/dist/server/web/spec-extension/cookies"));
 pg=new PGlite();await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));
 for(let i=0;i<2;i++)await pg.exec(await readFile("sql/010_openai_luna.sql","utf8"));
 for(const [i,user] of users.entries()){await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'test')",[user,`cloud${i}@example.test`]);await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[createHash("sha256").update("cloud"+i).digest("hex"),user]);}
});
after(()=>pg.close());
beforeEach(async()=>{process.env.OPENAI_API_KEY="FAKE-TEST-KEY";process.env.OPENAI_MONTHLY_BUDGET_USD="5";delete process.env.OPENAI_ENABLED;await pg.exec("DELETE FROM ai_preferences; DELETE FROM ai_api_usage");mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));});
afterEach(()=>{mock.restoreAll();delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MONTHLY_BUDGET_USD;});
function session<T>(user:number|null,fn:()=>T){const cookies=new Cookies(new Headers());if(user!==null)cookies.set("a3x_session","cloud"+user);return work.run({route:"/api/ai/provider"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));}
function req(body:unknown,origin="https://app.example"){return new Request("https://app.example/api/ai/provider",{method:"POST",headers:{host:"app.example",origin,"content-type":"application/json"},body:JSON.stringify(body)});}
const messages=[{role:"user" as const,content:"Como organizar meu trabalho?"}];
test("preferência exige sessão, origem, consentimento e isolamento; chave não ativa nuvem",async()=>{
 assert.equal((await session(null,()=>api.GET())).status,401);
 assert.equal(await provider.selectedProvider(users[0]),"local");
 assert.equal((await session(0,()=>api.POST(req({provider:"openai"})))).status,400);
 assert.equal((await session(0,()=>api.POST(req({provider:"openai",consent:true},"https://evil.test")))).status,403);
 assert.equal((await session(0,()=>api.POST(req({provider:"openai",consent:true,user_id:users[1]})))).status,400);
 assert.equal((await session(0,()=>api.POST(req({provider:"openai",consent:true})))).status,200);
 assert.equal(await provider.selectedProvider(users[0]),"openai");assert.equal(await provider.selectedProvider(users[1]),"local");
 assert.doesNotMatch(await (await session(0,()=>api.GET())).text(),/FAKE-TEST-KEY/);
 assert.equal((await session(0,()=>api.POST(req({provider:"local"})))).status,200);assert.equal(await provider.selectedProvider(users[0]),"local");
});
test("Responses usa somente chave no servidor e registra consumo sem mensagens",async()=>{
 let calls=0;mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{calls++;assert.equal(url,"https://api.openai.com/v1/responses");assert.equal((init.headers as Record<string,string>).Authorization,"Bearer FAKE-TEST-KEY");const body=JSON.parse(init.body as string);assert.equal(body.model,"gpt-6-luna");assert.equal(body.store,false);assert.equal(body.max_output_tokens,600);assert.equal(body.reasoning.effort,"none");assert.equal(body.tools,undefined);assert.doesNotMatch(init.body as string,/FAKE-TEST-KEY/);return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:"Defina uma prioridade."}]}],usage:{input_tokens:100,output_tokens:20}});});
 assert.equal(await luna.openAILunaReply(users[0],messages,new AbortController().signal),"Defina uma prioridade.");assert.equal(calls,1);
 const row=(await pg.query<{charged_microusd:number;status:string}>("SELECT * FROM ai_api_usage")).rows[0];assert.equal(row.charged_microusd,20);assert.equal(row.status,"succeeded");assert.doesNotMatch(JSON.stringify(row),/organizar|FAKE/);
});
test("teto global inclui reservas desconhecidas e libera rejeições",async()=>{
 process.env.OPENAI_MONTHLY_BUDGET_USD="0.001";
 const id=await provider.reserveAIUsage(users[0],600);await provider.finishAIUsage(id,"unknown");
 await assert.rejects(provider.reserveAIUsage(users[1],500),/Teto mensal/);
 const rejected=await provider.reserveAIUsage(users[1],300);await provider.finishAIUsage(rejected,"rejected");await provider.reserveAIUsage(users[1],400);
});
test("falhas não expõem corpo do provedor nem repetem chamadas; 4xx não consome reserva",async()=>{
 for(const status of [401,403,404,429,500]){await pg.exec("DELETE FROM ai_api_usage");let calls=0;mock.method(globalThis,"fetch",async()=>{calls++;return new Response("SECRET-PROVIDER-BODY",{status});});await assert.rejects(luna.openAILunaReply(users[0],messages,new AbortController().signal),error=>{assert.doesNotMatch(String(error),/SECRET/);return true;});assert.equal(calls,1);const row=(await pg.query<{status:string;charged_microusd:number|null}>("SELECT * FROM ai_api_usage")).rows[0];assert.equal(row.status,status<500?"rejected":"unknown");assert.equal(row.charged_microusd,status<500?0:null);mock.restoreAll();mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));}
});
test("abort anterior não chama API nem cria reserva; limite de concorrência por conta",async()=>{
 let calls=0;mock.method(globalThis,"fetch",async()=>{calls++;throw Error("unexpected");});const c=new AbortController();c.abort();await assert.rejects(luna.openAILunaReply(users[0],messages,c.signal));assert.equal(calls,0);assert.equal((await pg.query("SELECT * FROM ai_api_usage")).rows.length,0);
 await provider.reserveAIUsage(users[0],100);await provider.reserveAIUsage(users[0],100);await assert.rejects(provider.reserveAIUsage(users[0],100),/andamento/);await provider.reserveAIUsage(users[1],100);
});
test("histórico documental do computador é excluído somente no contexto nuvem",()=>{
 const history=[{role:"assistant" as const,content:"**Consulta documental privada — trechos literais**\nSEGREDO LOCAL"}];
 assert.doesNotMatch(JSON.stringify(model.modelMessages("Oi",history,[],[],null,[],"openai")),/SEGREDO LOCAL/);
 assert.match(JSON.stringify(model.modelMessages("Oi",history,[],[])),/SEGREDO LOCAL/);
});
test("Luna recebe trechos recuperados agora sem reenviar citações privadas antigas",()=>{
 const history=[{role:"assistant" as const,content:"TRECHO PRIVADO ANTIGO\n\n**Fontes:**\n- [K1] registro-antigo"}];
 const hits=[{id:"referencia",title:"Política de inventário",topic:"inventário",question:"Como contar?",answer:"TRECHO RECUPERADO",source_url:null,scope:"global" as const,score:1,matched:1,covered:2}];
 const context=JSON.stringify(model.modelMessages("Como contar?",history,[],hits,null,[],"openai"));
 assert.match(context,/K1.*TRECHO RECUPERADO/);
 assert.doesNotMatch(context,/TRECHO PRIVADO ANTIGO/);
 const document=model.modelMessages("Como contar?",history,[],hits,null,[],"openai",null,"[L1] TRECHO AUTORIZADO DO COMPUTADOR");
 assert.match(document[0].content,/\[L1\] TRECHO AUTORIZADO DO COMPUTADOR/);
});
test("Chat consulta a ponte para a Luna somente na pergunta autorizada",async()=>{
 for(const file of ["003_knowledge_entries.sql","006_cognitive_engine.sql","007_local_model_bridge.sql"])await pg.exec(await readFile("sql/"+file,"utf8"));
 const chat=await import("../app/api/chat/route");
 const conversation=(await pg.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[users[0]])).rows[0].id;
 assert.equal((await session(0,()=>api.POST(req({provider:"openai",consent:true})))).status,200);
 let lookups=0;
 const bridgeQuery=async(sql:string,params?:unknown[])=>{
  if(sql.startsWith("SELECT id FROM local_model_devices")){lookups++;return {rows:[{id:conversation}],rowCount:1};}
  if(sql.startsWith("INSERT INTO local_model_jobs"))return {rows:[{id:conversation}],rowCount:1};
  if(sql.startsWith("SELECT status,result FROM local_model_jobs"))return {rows:[{status:"completed",result:"TRECHO PRIVADO DA PONTE\n\n**Fontes:**\n- [L1] inventario.md"}],rowCount:1};
  return query(sql,params);
 };
 mock.method(db,"query",bridgeQuery);
 mock.method(db,"connect",async()=>({query:bridgeQuery,release(){}}));
 const requests:string[]=[];
 mock.method(globalThis,"fetch",async(_url:unknown,init:RequestInit)=>{
  requests.push(init.body as string);
  return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:"Resposta com fontes."}]}],usage:{input_tokens:100,output_tokens:20}});
 });
 for(const shareComputerDocuments of [false,true,false]){
  const response=await session(0,()=>chat.POST(req({conversationId:conversation,message:"Como funciona a contagem de inventário?",shareComputerDocuments,dotAgent:shareComputerDocuments?"mimo":"pipo"})));
  assert.match(await response.text(),/event: done/);
 }
 assert.equal(lookups,1);
 assert.equal(requests.length,3);
 assert.match(requests[0],/Pipo, coordenador/);assert.match(requests[1],/Mimo, organizador/);
 assert.equal((await session(0,()=>chat.POST(req({conversationId:conversation,message:"Fixture",dotAgent:"admin"})))).status,400);assert.equal(requests.length,3,"Invalid persona neither changes permissions nor triggers another call");
 assert.doesNotMatch(requests[0],/TRECHO PRIVADO DA PONTE/);
 assert.match(requests[1],/TRECHO PRIVADO DA PONTE/);
 assert.doesNotMatch(requests[2],/TRECHO PRIVADO DA PONTE/);
});
test("rede incerta, JSON inválido e resposta incompleta preservam reserva e não retornam conteúdo parcial",async()=>{
 for(const result of ["network","json","incomplete","empty","oversize"]){
  await pg.exec("DELETE FROM ai_api_usage");let calls=0;
  mock.method(globalThis,"fetch",async()=>{calls++;if(result==="network")throw Error("FAKE-TEST-KEY");if(result==="json")return new Response("invalid");if(result==="oversize")return new Response("x".repeat(128001));return Response.json({status:result==="incomplete"?"incomplete":"completed",output:result==="empty"?[]:[{type:"message",role:"assistant",content:[{type:"output_text",text:"PARTIAL"}]}]});});
  await assert.rejects(luna.openAILunaReply(users[0],messages,new AbortController().signal),error=>{assert.doesNotMatch(String(error),/PARTIAL|FAKE-TEST-KEY/);return true;});assert.equal(calls,1);assert.equal((await pg.query<{status:string}>("SELECT status FROM ai_api_usage")).rows[0].status,"unknown");
  mock.restoreAll();mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));
 }
});
