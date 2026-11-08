import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { before, afterEach, mock, test } from "node:test";

let db: typeof import("../lib/db").db;
let chat: typeof import("../app/api/chat/route");
let login: typeof import("../app/api/login/route");
let logout: typeof import("../app/api/logout/route");
let messages: typeof import("../app/api/conversations/[id]/messages/route");
let storage: typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage;
let workStorage: typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage;
let CookieStore: typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;

before(async () => {
  Object.assign(globalThis,{AsyncLocalStorage});
  ({db}=await import("../lib/db"));
  chat=await import("../app/api/chat/route");
  login=await import("../app/api/login/route");
  logout=await import("../app/api/logout/route");
  messages=await import("../app/api/conversations/[id]/messages/route");
  ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));
  ({workAsyncStorage:workStorage}=await import("next/dist/server/app-render/work-async-storage.external"));
  ({ResponseCookies:CookieStore}=await import("next/dist/server/web/spec-extension/cookies"));
});
afterEach(()=>mock.restoreAll());

function session<T>(signedIn:boolean, fn:()=>T) {
  const cookies=new CookieStore(new Headers());
  if (signedIn) cookies.set("a3x_session","token-local");
  return workStorage.run({route:"/api/test"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));
}
function request(path:string, body?:unknown) {
  return new Request(`https://app.example/api/${path}`,{method:"POST",
    headers:{host:"app.example",origin:"https://app.example","content-type":"application/json"},
    body:body===undefined?undefined:JSON.stringify(body)});
}
const id="00000000-0000-4000-8000-000000000001";
const result=(rows:unknown[]=[])=>({rows,rowCount:rows.length});

test("chat rejeita sessão ausente e histórico rejeita outro proprietário", async () => {
  assert.equal((await session(false,()=>chat.POST(request("chat",{})))).status,401);
  mock.method(db,"query",async (sql:string)=>result(sql.includes("JOIN users")?[{id,email:"local@example.test"}]:[]));
  const res=await session(true,()=>messages.GET(request("messages"),{params:Promise.resolve({id})}));
  assert.equal(res.status,404);
});

test("login emite cookie HttpOnly e logout revoga o hash da sessão", async () => {
  const {hashPassword}=await import("../lib/security");
  const password_hash=await hashPassword("senha-local-de-teste");
  const queries:string[]=[];
  mock.method(db,"query",async (sql:string)=>{
    queries.push(sql);
    return result(sql.includes("RETURNING attempts")?[{attempts:1}]:sql.includes("password_hash FROM users")?[{id,password_hash}]:[]);
  });
  await session(false,async()=>{
    const res=await login.POST(request("login",{email:"local@example.test",password:"senha-local-de-teste"}));
    assert.equal(res.status,200);
    const cookie=storage.getStore() as {userspaceMutableCookies:InstanceType<typeof CookieStore>};
    assert.equal(cookie.userspaceMutableCookies.get("a3x_session")?.httpOnly,true);
    assert.equal((await logout.POST(request("logout"))).status,200);
  });
  assert(queries.some(sql=>sql.includes("INSERT INTO sessions")));
  assert(queries.some(sql=>sql.includes("DELETE FROM sessions")));
});

test("stream completo persiste resposta; incompleto não persiste resposta parcial", async () => {
  for (const complete of [true,false]) {
    const queries:string[]=[];
    const query=async(sql:string)=>{
      queries.push(sql);
      if(sql.includes("JOIN users")) return result([{id,email:"local@example.test"}]);
      if(sql.includes("RETURNING busy_until"))return result([{busy_until:"2099-01-01 00:00:00+00"}]);
      if(sql.includes("RETURNING requests"))return result([{requests:1}]);
      if(sql.includes("SELECT role,content"))return result([{role:"user",content:"teste"}]);
      return result();
    };
    mock.method(db,"query",query);
    mock.method(db,"connect",async()=>({query,release(){}}));
    mock.method(globalThis,"fetch",async (_url:unknown,init:RequestInit) => {
      const body=JSON.parse(String(init.body));
      assert.equal(body.store,false);
      assert.equal(body.stream,true);
      const events=[{type:"response.output_text.delta",delta:"Resposta local"},
        {type:complete?"response.completed":"response.incomplete"}];
      return new Response(events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join(""),{
        headers:{"content-type":"text/event-stream"},
      });
    });
    // Apenas ativa o construtor; a chamada ao provedor é inteiramente substituída.
    const previous=process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY="local-test-placeholder";
    try {
      const res=await session(true,()=>chat.POST(request("chat",{conversationId:id,message:"teste"})));
      assert.equal(res.status,200);
      const text=await res.text();
      assert.match(text,complete?/event: done/:/event: failure/);
      assert.equal(queries.some(sql=>sql.includes("VALUES($1,'assistant'")),complete);
      assert(queries.includes("COMMIT"));
      assert(queries.some(sql=>sql.includes("busy_until=$3")));
    } finally {
      if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;
      mock.restoreAll();
    }
  }
});

test("indisponibilidade do banco retorna JSON genérico sem detalhes privados", async () => {
  mock.method(db,"query",async()=>{throw new Error("detalhe privado de teste");});
  const res=await session(true,()=>chat.POST(request("chat",{})));
  assert.equal(res.status,503);
  assert.doesNotMatch(await res.text(),/detalhe privado/);
});

test("cancelar leitura interrompe transporte OpenAI e libera a conversa", async () => {
  let unlocked=false, aborted=false;
  const query=async(sql:string)=>{
    if(sql.includes("JOIN users"))return result([{id,email:"local@example.test"}]);
    if(sql.includes("RETURNING busy_until"))return result([{busy_until:"2099-01-01 00:00:00+00"}]);
    if(sql.includes("RETURNING requests"))return result([{requests:1}]);
    if(sql.includes("SELECT role,content"))return result([{role:"user",content:"teste"}]);
    if(sql.includes("busy_until=$3"))unlocked=true;
    return result();
  };
  mock.method(db,"query",query);
  mock.method(db,"connect",async()=>({query,release(){}}));
  let fetched!:()=>void;
  const started=new Promise<void>(resolve=>{fetched=resolve;});
  mock.method(globalThis,"fetch",async (_url:unknown,init:RequestInit)=>{
    fetched();
    return new Promise<Response>((_resolve,reject)=>{
      init.signal!.addEventListener("abort",()=>{aborted=true;reject(new Error("cancelamento local"));},{once:true});
    });
  });
  const previous=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY="local-test-placeholder";
  try {
    const res=await session(true,()=>chat.POST(request("chat",{conversationId:id,message:"teste"})));
    await started;
    await res.body!.cancel();
    for(let i=0;i<50&&!unlocked;i++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(aborted,true);
    assert.equal(unlocked,true);
  } finally {
    if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;
  }
});

test("health retorna 503 quando o esquema necessário não está disponível", async () => {
  const health=await import("../app/api/health/route");
  const prevDb=process.env.DATABASE_URL, prevKey=process.env.OPENAI_API_KEY;
  process.env.DATABASE_URL="postgresql://localhost/local-test";
  process.env.OPENAI_API_KEY="local-test-placeholder";
  mock.method(db,"query",async()=>result([{ready:false}]));
  try {assert.equal((await health.GET()).status,503);} finally {
    if(prevDb===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=prevDb;
    if(prevKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prevKey;
  }
});
