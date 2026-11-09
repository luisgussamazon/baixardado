import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { before,after,beforeEach,afterEach,test,mock } from "node:test";
import { PGlite } from "@electric-sql/pglite";
let pg:PGlite,db:typeof import("../lib/db").db;
let api:typeof import("../app/api/local-model/route"),pair:typeof import("../app/api/local-model/pair/route"),jobs:typeof import("../app/api/local-model/jobs/route"),model:typeof import("../lib/local-model"),chat:typeof import("../app/api/chat/route");
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage;
let work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage;
let CookieStore:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
const users=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"],conversations:string[]=[];
async function query(sql:string,params?:unknown[]){const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}
before(async()=>{
  process.env.A3X_AUTO_STUDY="0"; // Coleta pública tem fixture separado; nunca rede real nesta suíte.
  Object.assign(globalThis,{AsyncLocalStorage});({db}=await import("../lib/db"));api=await import("../app/api/local-model/route");pair=await import("../app/api/local-model/pair/route");jobs=await import("../app/api/local-model/jobs/route");model=await import("../lib/local-model");chat=await import("../app/api/chat/route");
  ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));({ResponseCookies:CookieStore}=await import("next/dist/server/web/spec-extension/cookies"));
  pg=new PGlite();await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));
  for(const name of ["002_programmer_projects.sql","003_knowledge_entries.sql","006_cognitive_engine.sql","007_local_model_bridge.sql","007_local_model_bridge.sql","009_remember_local_computer.sql","009_remember_local_computer.sql"])await pg.exec(await readFile("sql/"+name,"utf8"));
  for(const [i,user] of users.entries()){
    await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'local')",[user,`bridge-${i}@example.test`]);
    await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[createHash("sha256").update("bridge-"+i).digest("hex"),user]);
    conversations.push((await pg.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[user])).rows[0].id);
  }
});
after(()=>pg.close());beforeEach(async()=>{await pg.exec("TRUNCATE local_model_devices CASCADE; DELETE FROM local_model_pairings; DELETE FROM login_attempts; DELETE FROM cognitive_records; DELETE FROM daily_usage; DELETE FROM messages;");mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));});afterEach(()=>mock.restoreAll());
function session<T>(user:number|null,fn:()=>T){const cookies=new CookieStore(new Headers());if(user!==null)cookies.set("a3x_session","bridge-"+user);return work.run({route:"/api/local-model"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));}
function req(body?:unknown,token?:string,origin="https://app.example"){return new Request("https://app.example/api/local-model",{method:body===undefined?"GET":"POST",headers:{host:"app.example",origin,"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
async function connect(owner:number){const response=await pair.POST(req({model:"qwen3:4b-instruct"}));assert.equal(response.status,201);const link=await response.json();assert.equal((await session(owner,()=>api.POST(req({action:"approve",code:link.code,confirmed:true})))).status,200);await jobs.POST(req({action:"poll"},link.token));return link as {token:string;code:string};}
async function claim(token:string){for(let i=0;i<100;i++){const response=await jobs.POST(req({action:"poll"},token));assert.equal(response.status,200);const {job}=await response.json();if(job)return job;await new Promise(resolve=>setTimeout(resolve,20));}throw new Error("Solicitação não enfileirada.");}
test("pareamento exige consentimento por sessão, guarda só hash e impede reutilização",async()=>{
  assert.equal((await session(null,()=>api.GET())).status,401);
  assert.equal((await pair.POST(req({model:"gpt-cloud"}))).status,400);
  assert.equal((await pair.POST(req({model:"qwen3:4b-instruct"},undefined,"https://evil.example"))).status,403);
  const response=await pair.POST(req({model:"qwen3:4b-instruct"})),link=await response.json();assert.equal(response.status,201);
  assert.equal((await session(0,()=>api.POST(req({action:"approve",code:link.code,confirmed:false})))).status,400);
  assert.equal((await session(0,()=>api.POST(req({action:"approve",code:link.code,confirmed:true,user_id:users[1]})))).status,400);
  assert.equal((await session(0,()=>api.POST(req({action:"approve",code:link.code,confirmed:true})))).status,200);
  assert.equal((await session(1,()=>api.POST(req({action:"approve",code:link.code,confirmed:true})))).status,404);
  assert.equal((await pair.GET(req(undefined,link.token))).status,200);
  const mine=await (await session(0,()=>api.GET())).text(),other=await (await session(1,()=>api.GET())).text();
  assert.match(mine,/qwen3/);assert.doesNotMatch(mine,new RegExp(link.token));assert.doesNotMatch(other,/qwen3/);
  assert.notEqual((await pg.query<{token_hash:string}>("SELECT token_hash FROM local_model_devices")).rows[0].token_hash,link.token);
});
test("fila de inferência só é acessível pelo computador e conta corretos",async()=>{
  const a=await connect(0),b=await connect(1);
  const pending=model.connectedModelReply(users[0],conversations[0],[{role:"user",content:"Pergunta privada A"}],new AbortController().signal);
  const job=await claim(a.token);assert.match(JSON.stringify(job.payload),/Pergunta privada A/);
  assert.equal((await (await jobs.POST(req({action:"heartbeat",id:job.id},a.token))).json()).active,true);
  assert.equal((await (await jobs.POST(req({action:"heartbeat",id:job.id},b.token))).json()).active,false);
  const other=await jobs.POST(req({action:"poll"},b.token));assert.equal((await other.json()).job,null);
  assert.equal((await jobs.POST(req({action:"complete",id:job.id,result:"Resposta indevida"},b.token))).status,404);
  assert.equal((await jobs.POST(req({action:"complete",id:job.id,result:"Resposta local correta"},a.token))).status,200);
  assert.equal(await pending,"Resposta local correta");assert.equal((await pg.query("SELECT * FROM local_model_jobs")).rows.length,0);
});
test("Chat usa resposta generativa e somente memória aprovada do dono",async()=>{
  const a=await connect(0);
  await pg.query(`INSERT INTO cognitive_records(user_id,kind,label,value,status,approved_at) VALUES($1,'fact','Nome','Privado outro','approved',NOW()),($2,'fact','Detalhe','Pendente dono','pending',NULL),($2,'fact','Preferência','Autorizado dono','approved',NOW())`,[users[1],users[0]]);
  const response=await session(0,()=>chat.POST(req({conversationId:conversations[0],message:"Vamos conversar sobre como organizar ideias?"})));assert.equal(response.status,200);
  const reading=response.text(),job=await claim(a.token),payload=JSON.stringify(job.payload);
  assert.match(payload,/Autorizado dono/);assert.doesNotMatch(payload,/Privado outro|Pendente dono/);
  assert.equal((await jobs.POST(req({action:"complete",id:job.id,result:"Podemos escolher uma ideia e definir o primeiro passo. Qual delas é prioridade?"},a.token))).status,200);
  const body=await reading;assert.match(body,/Qual delas é prioridade/);assert.doesNotMatch(body,/Gerado pelo modelo|confira informações importantes/);assert.match(body,/event: done/);
  const saved=await pg.query<{content:string}>("SELECT content FROM messages WHERE role='assistant'");assert.match(saved.rows[0].content,/Qual delas é prioridade/);
});
test("revogar e expirar conexões bloqueia acesso e preserva isolamento",async()=>{
  const a=await connect(0);const device=(await pg.query<{id:string}>("SELECT id FROM local_model_devices WHERE user_id=$1",[users[0]])).rows[0];
  assert.equal((await session(1,()=>api.POST(req({action:"revoke",id:device.id})))).status,404);
  assert.equal((await session(0,()=>api.POST(req({action:"revoke",id:device.id})))).status,200);
  assert.equal((await jobs.POST(req({action:"poll"},a.token))).status,401);
  const b=await connect(1);await pg.query("UPDATE local_model_devices SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=$1",[users[1]]);
  assert.equal((await jobs.POST(req({action:"poll"},b.token))).status,401);
});
test("sem computador ou ponte desativada não há chamada externa; limites são validados",async()=>{
  assert.equal(await model.connectedModelReply(users[0],conversations[0],[{role:"user",content:"Oi"}],new AbortController().signal),null);
  const a=await connect(0);
  assert.equal((await jobs.POST(req({action:"poll",user_id:users[1]},a.token))).status,400);
  assert.equal((await jobs.POST(req({action:"complete",id:conversations[0],result:"x".repeat(12001)},a.token))).status,400);
  const controller=new AbortController();controller.abort();await assert.rejects(()=>model.connectedModelReply(users[0],conversations[0],[{role:"user",content:"Cancelar"}],controller.signal));
  assert.equal((await pg.query("SELECT * FROM local_model_jobs")).rows.length,0);
});

test("lembrar computador sobrevive à expiração temporal, mantém isolamento e permite revogar",async()=>{
  const resume=await import("../app/api/local-model/session/route");
  const link=await (await pair.POST(req({model:"qwen3:4b-instruct"}))).json();
  const approval={action:"approve",code:link.code,confirmed:true,remember:true};
  assert.equal((await session(0,()=>api.POST(req(approval)))).status,200);
  assert.equal((await session(0,()=>api.POST(req(approval)))).status,200);
  assert.equal((await session(1,()=>api.POST(req(approval)))).status,404);
  await pg.query("UPDATE local_model_devices SET expires_at=NOW()-INTERVAL '1 day' WHERE user_id=$1",[users[0]]);
  assert.deepEqual(await (await resume.POST(req({action:"resume"},link.token))).json(),{ok:true,remembered:true});
  assert.equal((await jobs.POST(req({action:"poll"},link.token))).status,200);
  const mine=await (await session(0,()=>api.GET())).json(),other=await (await session(1,()=>api.GET())).json();
  assert.equal(mine.devices.length,1);assert.equal(mine.devices[0].remembered,true);assert.equal(other.devices.length,0);
  assert.equal((await resume.POST(req({action:"resume"},link.token,"https://evil.example"))).status,403);
  assert.equal((await resume.POST(req({action:"resume",user_id:users[1]},link.token))).status,400);
  assert.equal((await resume.POST(req({action:"resume"},"f".repeat(64)))).status,401);
  assert.equal((await session(0,()=>api.POST(req({action:"revoke",id:mine.devices[0].id})))).status,200);
  assert.equal((await resume.POST(req({action:"resume"},link.token))).status,401);
});

test("conexão temporária expirada não é recuperada pela rota automática",async()=>{
  const resume=await import("../app/api/local-model/session/route"),link=await connect(0);
  await pg.query("UPDATE local_model_devices SET expires_at=NOW()-INTERVAL '1 day'");
  assert.equal((await resume.POST(req({action:"resume"},link.token))).status,401);
});
