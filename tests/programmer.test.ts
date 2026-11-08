import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { unzipSync, strFromU8 } from "fflate";

let pg:PGlite;
let db:typeof import("../lib/db").db;
let projects:typeof import("../app/api/projects/route");
let detail:typeof import("../app/api/projects/[id]/route");
let download:typeof import("../app/api/projects/[id]/download/route");
let chat:typeof import("../app/api/chat/route");
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage;
let work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage;
let CookieStore:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
const users=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"];
const sample={name:"Tarefas",summary:"Projeto de teste local",files:[{path:"README.md",content:"# Tarefas\nInstalação"},{path:"src/app.ts",content:'const exemplo = "olá";'}]};
let prevLimit:string|undefined;

before(async()=>{
  Object.assign(globalThis,{AsyncLocalStorage});
  ({db}=await import("../lib/db"));
  projects=await import("../app/api/projects/route");
  detail=await import("../app/api/projects/[id]/route");
  download=await import("../app/api/projects/[id]/download/route");
  chat=await import("../app/api/chat/route");
  ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));
  ({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));
  ({ResponseCookies:CookieStore}=await import("next/dist/server/web/spec-extension/cookies"));
  pg=new PGlite();
  const initial=(await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;","");
  await pg.exec(initial);
  await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,'anterior@example.test','local-test')",[users[0]]);
  const existing=await pg.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[users[0]]);
  await pg.query("INSERT INTO messages(conversation_id,role,content) VALUES($1,'user','histórico anterior preservado')",[existing.rows[0].id]);
  const migration=await readFile("sql/002_programmer_projects.sql","utf8");
  await pg.exec(migration);await pg.exec(migration);
  assert.equal((await pg.query<{content:string}>("SELECT content FROM messages")).rows[0].content,"histórico anterior preservado");
});
after(async()=>{await pg.close();});
beforeEach(async()=>{
  await pg.exec("TRUNCATE users CASCADE");
  for(const [i,id] of users.entries()){
    await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'local-test')",[id,`local${i}@example.test`]);
    const hash=createHash("sha256").update(`token-${i}`).digest("hex");
    await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[hash,id]);
  }
  const query=async(sql:string,params?:unknown[])=>{
    const result=await pg.query(sql,params);
    return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};
  };
  mock.method(db,"query",query);
  mock.method(db,"connect",async()=>({query,release(){}}));
  prevLimit=process.env.DAILY_MESSAGE_LIMIT;
  process.env.DAILY_MESSAGE_LIMIT="50";
});
afterEach(()=>{
  mock.restoreAll();
  for(const [key,value] of [["DAILY_MESSAGE_LIMIT",prevLimit]]){
    if(value===undefined)delete process.env[key!];else process.env[key!]=value;
  }
});
function session<T>(user:number|null,fn:()=>T){
  const cookies=new CookieStore(new Headers());
  if(user!==null)cookies.set("a3x_session",`token-${user}`);
  return work.run({route:"/api/projects"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));
}
function request(body:unknown={description:"Sistema de tarefas"},origin="https://app.example"){
  return new Request("https://app.example/api/projects",{method:"POST",headers:{host:"app.example",origin,"content-type":"application/json"},body:JSON.stringify(body)});
}
const context=(id:string)=>({params:Promise.resolve({id})});
function provider(){
  return mock.method(globalThis,"fetch",async(url:unknown)=>{
    assert.equal(new URL(String(url)).hostname,"www.bing.com");
    return new Response('<rss><channel><item><title>Sistema de tarefas</title><link>https://example.com/documentacao</link><description>Referencia tecnica</description></item></channel></rss>');
  });
}
async function generate(){
  const res=await session(0,()=>projects.POST(request()));
  assert.equal(res.status,200,await (res.status!==200?res.text():Promise.resolve("")));
  const text=await res.text();
  const id=(text.match(/event: started\ndata: {"id":"([^"]+)"}/)||[])[1];
  assert(id);
  return {id,text};
}

test("projetos exigem sessão, origem válida e descrição limitada antes de consumir cota",async()=>{
  assert.equal((await session(null,()=>projects.GET())).status,401);
  assert.equal((await session(null,()=>projects.POST(request()))).status,401);
  assert.equal((await session(0,()=>projects.POST(request({},"https://evil.example")))).status,403);
  for(const description of [""," ","x".repeat(4001),"x\0",42]){
    assert.equal((await session(0,()=>projects.POST(request({description})))).status,400);
  }
  assert.equal((await pg.query("SELECT * FROM daily_usage")).rows.length,0);
});

test("geração válida persiste múltiplos arquivos e ZIP apenas para o proprietário",async()=>{
  provider();
  const {id,text}=await generate();assert.match(text,/event: done/);
  const mine=await session(0,()=>detail.GET(request(),context(id)));assert.equal(mine.status,200);
  const expected=(await mine.json()).project.files as typeof sample.files;
  assert(expected.some(file=>file.path==="docs/pesquisa.md"&&file.content.includes("example.com")));
  assert.equal((await session(1,()=>detail.GET(request(),context(id)))).status,404);
  assert.deepEqual((await (await session(1,()=>projects.GET())).json()).projects,[]);
  assert.equal((await session(1,()=>download.GET(request(),context(id)))).status,404);
  assert.equal((await session(null,()=>download.GET(request(),context(id)))).status,401);
  const zip=await session(0,()=>download.GET(request(),context(id)));assert.equal(zip.status,200);
  assert.equal(zip.headers.get("content-type"),"application/zip");assert.match(zip.headers.get("cache-control")!,/no-store/);
  const files=unzipSync(new Uint8Array(await zip.arrayBuffer()));
  for(const file of expected)assert.equal(strFromU8(files[file.path]),file.content);
  assert.equal((await session(1,()=>detail.DELETE(request(),context(id)))).status,409);
  assert.equal((await session(0,()=>detail.DELETE(request(),context(id)))).status,200);
  assert.equal((await session(0,()=>detail.GET(request(),context(id)))).status,404);
});

test("busca indisponivel nao libera projeto nem ZIP",async()=>{
  mock.method(globalThis,"fetch",async()=>new Response("unavailable",{status:503}));
  const {id,text}=await generate();assert.match(text,/event: failure/);assert.doesNotMatch(text,/event: done/);
  const saved=await pg.query<{status:string;files:unknown[]}>("SELECT status,files FROM programmer_projects WHERE id=$1",[id]);
  assert.equal(saved.rows[0].status,"failed");assert.deepEqual(saved.rows[0].files,[]);
  assert.equal((await session(0,()=>download.GET(request(),context(id)))).status,409);
});

test("reserva respeita 100 projetos e recupera geração expirada sem gastar cota extra",async()=>{
  await pg.query(`INSERT INTO programmer_projects(user_id,description,status)
    SELECT $1,'projeto local','failed' FROM generate_series(1,100)`,[users[0]]);
  assert.equal((await session(0,()=>projects.POST(request()))).status,429);
  assert.equal((await pg.query("SELECT * FROM daily_usage")).rows.length,0);
  await pg.query("DELETE FROM programmer_projects WHERE user_id=$1",[users[0]]);
  const expired=await pg.query<{id:string}>(`INSERT INTO programmer_projects(user_id,description,generation_expires_at)
    VALUES($1,'geração local interrompida',NOW()-INTERVAL '1 minute') RETURNING id`,[users[0]]);
  const state=await session(0,()=>detail.GET(request(),context(expired.rows[0].id)));
  assert.equal((await state.json()).project.status,"failed");
  provider();const {text}=await generate();assert.match(text,/event: done/);
  assert.equal((await pg.query<{status:string}>("SELECT status FROM programmer_projects WHERE id=$1",[expired.rows[0].id])).rows[0].status,"failed");
  assert.equal((await pg.query<{requests:number}>("SELECT requests FROM daily_usage")).rows[0].requests,1);
});

test("falha de persistência reverte a cota; download revalida conteúdo armazenado",async()=>{
  mock.method(db,"connect",async()=>({release(){},query:async(sql:string,params?:unknown[])=>{
    if(sql.includes("INSERT INTO programmer_projects"))throw new Error("falha local simulada");
    const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};
  }}));
  const res=await session(0,()=>projects.POST(request()));assert.equal(res.status,503);
  assert.equal((await pg.query("SELECT * FROM daily_usage")).rows.length,0);
  assert.equal((await pg.query("SELECT * FROM programmer_projects")).rows.length,0);
  const unsafe={...sample,files:[{path:"../escape",content:"não expor"},sample.files[0]]};
  const stored=await pg.query<{id:string}>(`INSERT INTO programmer_projects(user_id,description,name,summary,files,status)
    VALUES($1,'local','local','local',$2::jsonb,'ready') RETURNING id`,[users[0],JSON.stringify(unsafe.files)]);
  const downloadRes=await session(0,()=>download.GET(request(),context(stored.rows[0].id)));
  assert.equal(downloadRes.status,503);assert.doesNotMatch(await downloadRes.text(),/não expor/);
});

test("cota é compartilhada com Chat e reserva negada não deixa projeto pendente",async()=>{
  process.env.DAILY_MESSAGE_LIMIT="1";provider();
  const {text}=await generate();assert.match(text,/event: done/);
  assert.equal((await session(0,()=>projects.POST(request()))).status,429);
  assert.equal((await pg.query("SELECT * FROM programmer_projects")).rows.length,1);
  const conversation=await pg.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[users[0]]);
  const res=await session(0,()=>chat.POST(request({conversationId:conversation.rows[0].id,message:"pergunta"})));
  assert.equal(res.status,429);
  assert.equal((await pg.query("SELECT * FROM messages")).rows.length,0);
});

test("reserva impede geração simultânea; cancelamento aborta provedor e registra falha",async()=>{
  let fetched!:()=>void,aborted=false;
  const started=new Promise<void>(resolve=>{fetched=resolve;});
  mock.method(globalThis,"fetch",async(_url:unknown,init:RequestInit)=>{
    fetched();return new Promise<Response>((_resolve,reject)=>{
      init.signal!.addEventListener("abort",()=>{aborted=true;reject(new Error("cancelado localmente"));},{once:true});
    });
  });
  const res=await session(0,()=>projects.POST(request()));assert.equal(res.status,200);await started;
  const row=await pg.query<{id:string}>("SELECT id FROM programmer_projects");const id=row.rows[0].id;
  assert.equal((await session(0,()=>projects.POST(request()))).status,409);
  assert.equal((await session(0,()=>detail.DELETE(request(),context(id)))).status,409);
  await res.body!.cancel();
  let status="generating";
  for(let i=0;i<100&&status==="generating";i++){
    await new Promise(resolve=>setTimeout(resolve,10));
    status=(await pg.query<{status:string}>("SELECT status FROM programmer_projects WHERE id=$1",[id])).rows[0].status;
  }
  assert.equal(aborted,true);assert.equal(status,"failed");
  assert.equal((await pg.query<{requests:number}>("SELECT requests FROM daily_usage")).rows[0].requests,1);
});
