import assert from "node:assert/strict";
import {AsyncLocalStorage} from "node:async_hooks";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {before,after,beforeEach,afterEach,test,mock} from "node:test";
import {PGlite} from "@electric-sql/pglite";
import {browserPageUrl,validateObservation,browserNavigationRequest,INVENTORY_ORIGIN as SITE} from "../lib/browser-policy";
let pg:PGlite,db:typeof import("../lib/db").db,api:typeof import("../app/api/browser/route"),pair:typeof import("../app/api/browser/pair/route"),device:typeof import("../app/api/browser/device/route"),context:typeof import("../lib/browser-device");
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage,work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage,Cookies:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
const users=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"];
async function query(sql:string,params?:unknown[]){const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}
before(async()=>{
 Object.assign(globalThis,{AsyncLocalStorage});({db}=await import("../lib/db"));api=await import("../app/api/browser/route");pair=await import("../app/api/browser/pair/route");device=await import("../app/api/browser/device/route");context=await import("../lib/browser-device");
 ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));({ResponseCookies:Cookies}=await import("next/dist/server/web/spec-extension/cookies"));
 pg=new PGlite();await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));for(let i=0;i<2;i++)await pg.exec(await readFile("sql/011_browser_companion.sql","utf8"));
 for(const [i,user] of users.entries()){await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'test')",[user,`browser${i}@example.test`]);await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[createHash("sha256").update("browser"+i).digest("hex"),user]);}
});
after(()=>pg.close());beforeEach(async()=>{await pg.exec("TRUNCATE browser_devices CASCADE; DELETE FROM browser_pairings; DELETE FROM login_attempts");mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));});afterEach(()=>mock.restoreAll());
function session<T>(user:number|null,fn:()=>T){const cookies=new Cookies(new Headers());if(user!==null)cookies.set("a3x_session","browser"+user);return work.run({route:"/api/browser"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));}
function req(body:unknown,token?:string,origin="https://app.example"){return new Request("https://app.example/api/browser",{method:"POST",headers:{host:"app.example",origin,"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:JSON.stringify(body)});}
async function connect(owner=0){const r=await pair.POST(req({})),p=await r.json();assert.equal(r.status,201);assert.equal((await session(owner,()=>api.POST(req({action:"approve",code:p.code,confirmed:true})))).status,200);await device.POST(req({action:"poll"},p.token));const data=await (await session(owner,()=>api.GET())).json();return {token:p.token,id:data.devices[0].id,code:p.code};}
test("política bloqueia domínios externos, SSRF, query sensível, execução e páginas de login",()=>{
 for(const value of ["http://127.0.0.1/",SITE+"/api/delete",SITE+"/logout",SITE+"/schedule?token=secret",SITE+"/schedule#x","javascript:alert(1)","https://evil.test/schedule",SITE.replace("https://","https://user:pass@")+"/schedule"])assert.equal(browserPageUrl(value),null);
 assert.equal(browserPageUrl(SITE+"/schedule"),SITE+"/schedule");assert.equal(validateObservation({url:SITE+"/login",title:"login",text:"secret"}),null);assert.equal(validateObservation({url:SITE+"/schedule",title:"Cronograma",text:"x".repeat(6001)}),null);assert.equal(validateObservation({url:SITE+"/schedule?token=x",title:"Cronograma",text:"data"}),null);
 assert.equal(browserNavigationRequest("Abra o cronograma")?.url,SITE+"/schedule");assert.equal(browserNavigationRequest("vá para relatórios")?.url,SITE+"/reports");for(const text of ["pesquise como abrir cronograma","abra https://evil.test","exclua o inventário","abra o cronograma e altere estoque"])assert.equal(browserNavigationRequest(text),null);
});
test("pareamento exige autorização da conta, código único e armazena somente hash",async()=>{
 assert.equal((await session(null,()=>api.GET())).status,401);assert.equal((await session(0,()=>api.POST(req({action:"approve",code:"ABCDEF123456",confirmed:true},undefined,"https://evil.test")))).status,403);
 const p=await (await pair.POST(req({}))).json();assert.equal((await device.POST(req({action:"poll"},p.token))).status,401);
 assert.equal((await session(0,()=>api.POST(req({action:"approve",code:p.code,confirmed:false})))).status,400);
 assert.equal((await session(0,()=>api.POST(req({action:"approve",code:p.code,confirmed:true,user_id:users[1]})))).status,400);
 assert.equal((await session(0,()=>api.POST(req({action:"approve",code:p.code,confirmed:true})))).status,200);
 assert.equal((await session(1,()=>api.POST(req({action:"approve",code:p.code,confirmed:true})))).status,404);
 assert.doesNotMatch(JSON.stringify((await pg.query("SELECT * FROM browser_devices")).rows),new RegExp(p.token));assert.doesNotMatch(await (await session(0,()=>api.GET())).text(),/token_hash/);
});
test("capturas são privadas, revisadas, limitadas e expiram para contexto",async()=>{
 const a=await connect(),b=await connect(1),observation={url:SITE+"/schedule",title:"Cronograma",text:"DADO PRIVADO"};
 assert.equal((await device.POST(req({action:"observe",observation,confirmed:false},a.token))).status,400);
 assert.equal((await device.POST(req({action:"observe",observation,confirmed:true},a.token))).status,200);
 assert.equal((await context.browserContext(users[0],a.id))?.text,"DADO PRIVADO");assert.equal(await context.browserContext(users[1],a.id),null);
 assert.doesNotMatch(await (await session(1,()=>api.GET())).text(),/DADO PRIVADO/);
 assert.equal((await device.POST(req({action:"observe",observation,confirmed:true,user_id:users[0]},b.token))).status,400);
 await pg.query("UPDATE browser_devices SET observed_at=NOW()-INTERVAL '31 minutes' WHERE id=$1",[a.id]);assert.equal(await context.browserContext(users[0],a.id),null);await session(0,()=>api.GET());assert.equal((await pg.query<{observation:unknown}>("SELECT observation FROM browser_devices WHERE id=$1",[a.id])).rows[0].observation,null);
});
test("fila exige dono, confirmação, site permitido; claim único e sem repetição",async()=>{
 const a=await connect(),b=await connect(1),command={action:"navigate",id:a.id,url:SITE+"/schedule",confirmed:true};
 assert.equal((await session(1,()=>api.POST(req(command)))).status,409);assert.equal((await session(0,()=>api.POST(req({...command,confirmed:false})))).status,400);assert.equal((await session(0,()=>api.POST(req({...command,url:SITE+"/api/delete"})))).status,400);
 assert.equal((await session(0,()=>api.POST(req(command)))).status,200);assert.equal((await session(0,()=>api.POST(req(command)))).status,409);
 assert.equal((await (await device.POST(req({action:"poll"},b.token))).json()).command,null);
 const first=await (await device.POST(req({action:"poll"},a.token))).json();assert.equal(first.command.url,SITE+"/schedule");assert.equal((await (await device.POST(req({action:"poll"},a.token))).json()).command,null);
 assert.equal((await device.POST(req({action:"complete",id:first.command.id,ok:true},b.token))).status,404);assert.equal((await device.POST(req({action:"complete",id:first.command.id,ok:true},a.token))).status,200);
 assert.equal((await device.POST(req({action:"complete",id:first.command.id,ok:true},a.token))).status,404);
});
test("revogação apaga captura e fila; dispositivo expirado não recebe comandos",async()=>{
 const a=await connect();assert.equal((await session(1,()=>api.POST(req({action:"revoke",id:a.id})))).status,404);
 await session(0,()=>api.POST(req({action:"navigate",id:a.id,url:SITE+"/schedule",confirmed:true})));
 assert.equal((await session(0,()=>api.POST(req({action:"revoke",id:a.id})))).status,200);assert.equal((await device.POST(req({action:"poll"},a.token))).status,401);assert.equal((await pg.query("SELECT * FROM browser_commands")).rows.length,0);
 const b=await connect();await pg.query("UPDATE browser_devices SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1",[b.id]);assert.equal((await device.POST(req({action:"poll"},b.token))).status,401);
});
