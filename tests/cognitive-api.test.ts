import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { before,after,beforeEach,afterEach,test,mock } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { decide } from "../lib/cognitive/engine";
let pg:PGlite,db:typeof import("../lib/db").db;
let api:typeof import("../app/api/cognitive/records/route"),item:typeof import("../app/api/cognitive/records/[id]/route");
let store:typeof import("../lib/cognitive/store"),chat:typeof import("../app/api/chat/route");
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage;
let work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage;
let CookieStore:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
const users=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"];
const conversations:string[]=[];
async function query(sql:string,params?:unknown[]){const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}
before(async()=>{
  Object.assign(globalThis,{AsyncLocalStorage});
  ({db}=await import("../lib/db"));api=await import("../app/api/cognitive/records/route");item=await import("../app/api/cognitive/records/[id]/route");store=await import("../lib/cognitive/store");chat=await import("../app/api/chat/route");
  ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));
  ({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));
  ({ResponseCookies:CookieStore}=await import("next/dist/server/web/spec-extension/cookies"));
  pg=new PGlite();await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));
  for(const name of ["002_programmer_projects.sql","003_knowledge_entries.sql","004_knowledge_seed_v1.sql","005_dialogue_seed_v2.sql","006_cognitive_engine.sql","006_cognitive_engine.sql"])await pg.exec(await readFile("sql/"+name,"utf8"));
  for(const [i,user] of users.entries()){
    await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'local-test')",[user,`cognitive-${i}@example.test`]);
    await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[createHash("sha256").update(`cognitive-${i}`).digest("hex"),user]);
    conversations.push((await pg.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[user])).rows[0].id);
  }
});
after(()=>pg.close());beforeEach(()=>{mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));});afterEach(()=>mock.restoreAll());
function session<T>(user:number|null,fn:()=>T){const cookies=new CookieStore(new Headers());if(user!==null)cookies.set("a3x_session",`cognitive-${user}`);return work.run({route:"/api/cognitive"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));}
function request(method:string,body?:unknown,origin="https://app.example"){return new Request("https://app.example/api/cognitive/records",{method,headers:{host:"app.example",origin,"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});}

test("API isola memória, exige aprovação separada e bloqueia CSRF e campos de proprietário",async()=>{
  const payload={kind:"fact",label:"Cidade",value:"Cidade de teste"};
  assert.equal((await session(null,()=>api.GET())).status,401);
  assert.equal((await session(null,()=>api.POST(request("POST",payload)))).status,401);
  assert.equal((await session(0,()=>api.POST(request("POST",payload,"https://evil.example")))).status,403);
  for(const extra of [{user_id:users[1]},{status:"approved"},{value:"x".repeat(4001)}])assert.equal((await session(0,()=>api.POST(request("POST",{...payload,...extra})))).status,400);
  const response=await session(0,()=>api.POST(request("POST",payload)));assert.equal(response.status,201);
  const {record}=await response.json();assert.equal(record.status,"pending");
  const context={params:Promise.resolve({id:record.id})};
  assert.equal((await store.loadCognitiveContext(users[0],conversations[0])).records.length,0);
  assert.doesNotMatch(await (await session(1,()=>api.GET())).text(),/Cidade de teste/);
  assert.equal((await session(1,()=>item.PATCH(request("PATCH",{action:"approve"}),context))).status,404);
  assert.equal((await session(1,()=>item.DELETE(request("DELETE"),context))).status,404);
  assert.equal((await session(0,()=>item.PATCH(request("PATCH",{action:"approve",user_id:users[1]}),context))).status,400);
  assert.equal((await session(0,()=>item.PATCH(request("PATCH",{action:"approve"}),context))).status,200);
  assert.equal((await store.loadCognitiveContext(users[0],conversations[0])).records.length,1);
  assert.equal((await store.loadCognitiveContext(users[1],conversations[1])).records.length,0);
  assert.equal((await session(0,()=>item.DELETE(request("DELETE"),context))).status,200);
  assert.equal((await store.loadCognitiveContext(users[0],conversations[0])).records.length,0);
});
test("estado persiste além da janela de histórico e escrita não atravessa proprietário",async()=>{
  let state=decide("planeje estudar banco",[]).state;state=decide("iniciar plano",[],state).state;
  for(let i=0;i<80;i++)state=decide("continue",[],state).state;
  await store.saveDialogueState(users[0],conversations[0],state);
  assert.equal((await store.loadCognitiveContext(users[0],conversations[0])).state.turns,82);
  assert.equal((await store.loadCognitiveContext(users[1],conversations[0])).state.goal,null);
  await store.saveDialogueState(users[1],conversations[0],decide("planeje invadir outro plano",[]).state);
  assert.equal((await store.loadCognitiveContext(users[0],conversations[0])).state.goal?.title,"estudar banco");
  await assert.rejects(()=>store.persistDialogueReply(users[1],conversations[0],state,"Resposta indevida"));
  assert.equal((await pg.query("SELECT * FROM messages WHERE content='Resposta indevida'")).rows.length,0);
});
test("Chat só envia consulta pessoal depois de confirmação e informa confiança",async()=>{
  const network=mock.method(globalThis,"fetch",async()=>new Response('<rss><channel><item><title>Contato pessoa</title><link>https://example.com/contato</link><description>Contato pessoa email</description></item></channel></rss>'));
  const send=async(message:string)=>{
    const res=await session(0,()=>chat.POST(request("POST",{message,conversationId:conversations[0]})));assert.equal(res.status,200);return res.text();
  };
  assert.match(await send("pesquise meu email pessoa@example.com"),/confirmo envio/);assert.equal(network.mock.calls.length,0);
  assert.match(await send("confirmo envio à web"),/event: done/);assert.ok(network.mock.calls.length>0);
  assert.match(await send("minha memória"),/Confiança de correspondência/);
});
test("cota de memória é aplicada no banco e exclusão da conversa limpa seu estado",async()=>{
  await pg.query(`INSERT INTO cognitive_records(user_id,kind,label,value) SELECT $1,'fact','Cota','Teste' FROM generate_series(1,200)`,[users[1]]);
  assert.equal((await session(1,()=>api.POST(request("POST",{kind:"fact",label:"Extra",value:"Excesso"})))).status,429);
  await pg.query("DELETE FROM conversations WHERE id=$1",[conversations[0]]);
  assert.equal((await pg.query("SELECT * FROM cognitive_dialogue_states WHERE conversation_id=$1",[conversations[0]])).rows.length,0);
  assert.equal((await pg.query("SELECT * FROM knowledge_entries")).rows.length,113);
});
