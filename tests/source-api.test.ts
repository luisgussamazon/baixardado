import assert from "node:assert/strict";
import {AsyncLocalStorage} from "node:async_hooks";
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir,unlink} from "node:fs/promises";
import {before,after,beforeEach,afterEach,test,mock} from "node:test";
import {PGlite} from "@electric-sql/pglite";
let pg:PGlite,db:typeof import("../lib/db").db,api:typeof import("../app/api/source/route"),download:typeof import("../app/api/source/[id]/route"),backup:Buffer|undefined;
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage,work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage,Cookies:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
const users=["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"],path="components/chat-app.tsx",oldText='"Original"';
async function query(sql:string,params?:unknown[]){const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}
before(async()=>{
 await mkdir(".generated",{recursive:true});backup=await readFile(".generated/a3x-source.json").catch(()=>undefined);await writeFile(".generated/a3x-source.json",JSON.stringify({repository:"luisgussamazon/baixardado",files:[{path,sha:"a".repeat(40),content:'export const title = "Original";\n'},{path:"lib/security.ts",sha:"b".repeat(40),content:"export const privateData = false;"}]}));
 Object.assign(globalThis,{AsyncLocalStorage});({db}=await import("../lib/db"));api=await import("../app/api/source/route");download=await import("../app/api/source/[id]/route");
 ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));({ResponseCookies:Cookies}=await import("next/dist/server/web/spec-extension/cookies"));
 pg=new PGlite();await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));for(const file of ["010_openai_luna.sql","012_source_proposals.sql","012_source_proposals.sql"])await pg.exec(await readFile("sql/"+file,"utf8"));
 for(const [i,user] of users.entries()){await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'test')",[user,`source${i}@example.test`]);await pg.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')",[createHash("sha256").update("source"+i).digest("hex"),user]);}
});
after(async()=>{await pg.close();if(backup)await writeFile(".generated/a3x-source.json",backup);else await unlink(".generated/a3x-source.json");});
beforeEach(async()=>{process.env.OPENAI_API_KEY="FAKE-TEST-KEY";await pg.exec("DELETE FROM source_proposals; DELETE FROM ai_api_usage; DELETE FROM ai_preferences");mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));});afterEach(()=>{mock.restoreAll();delete process.env.OPENAI_API_KEY;});
function session<T>(user:number|null,fn:()=>T){const cookies=new Cookies(new Headers());if(user!==null)cookies.set("a3x_session","source"+user);return work.run({route:"/api/source"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));}
function req(body?:unknown,origin="https://app.example"){return new Request("https://app.example/api/source",{method:body===undefined?"GET":"POST",headers:{host:"app.example",origin,"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});}
const body={goal:"Melhorar título",paths:[path],consent:true};
async function enable(){await pg.query("INSERT INTO ai_preferences(user_id,provider,cloud_consent_version,cloud_consented_at) VALUES($1,'openai',1,NOW())",[users[0]]);}
test("leitura exige login e escrita exige origem, consentimento e modo OpenAI",async()=>{
 assert.equal((await session(null,()=>api.GET(req()))).status,401);assert.equal((await session(0,()=>api.POST(req(body,"https://evil.test")))).status,403);assert.equal((await session(0,()=>api.POST(req({...body,consent:false})))).status,400);assert.equal((await session(0,()=>api.POST(req(body)))).status,409);await enable();
 assert.equal((await session(0,()=>api.POST(req({...body,paths:[".env.local"]})))).status,400);assert.equal((await session(0,()=>api.POST(req({...body,paths:["lib/security.ts"]})))).status,400);assert.equal((await session(0,()=>api.GET(new Request("https://app.example/api/source?path=../../.env")))).status,404);assert.doesNotMatch(await (await session(0,()=>api.GET(req()))).text(),/FAKE-TEST-KEY/);
});
test("proposta usa fonte selecionada, JSON limitado, orçamento e download privado",async()=>{
 await enable();let calls=0;mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{calls++;assert.equal(url,"https://api.openai.com/v1/responses");const input=JSON.parse(init.body as string);assert.equal(input.max_output_tokens,4000);assert.deepEqual(input.text,{format:{type:"json_object"}});assert.match(init.body as string,/Original/);assert.doesNotMatch(init.body as string,/privateData|FAKE-TEST-KEY/);return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify({summary:"Título revisado",edits:[{path,oldText,newText:'"Revisado"'}]})}]}],usage:{input_tokens:100,output_tokens:40}});});
 const response=await session(0,()=>api.POST(req(body)));assert.equal(response.status,201);const result=await response.json();assert.equal(result.proposal.files[0].sha,"a".repeat(40));assert.equal(calls,1);
 const params={params:Promise.resolve({id:result.id})};assert.equal((await session(1,()=>download.GET(req(),params))).status,404);assert.equal((await session(0,()=>download.GET(req(),params))).status,200);assert.equal((await session(null,()=>download.GET(req(),params))).status,401);
 assert.doesNotMatch(await (await session(1,()=>api.GET(req()))).text(),/Melhorar título/);assert.equal((await pg.query<{status:string}>("SELECT status FROM ai_api_usage")).rows[0].status,"succeeded");
});
test("resposta inválida não vira proposta aplicável; quota bloqueia antes de chamar API",async()=>{
 await enable();let calls=0;mock.method(globalThis,"fetch",async()=>{calls++;return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:"{}"}]}],usage:{input_tokens:100,output_tokens:2}});});
 assert.equal((await session(0,()=>api.POST(req(body)))).status,502);assert.equal((await pg.query<{status:string}>("SELECT status FROM source_proposals")).rows[0].status,"failed");await pg.query("INSERT INTO source_proposals(user_id,goal,status) VALUES($1,'teste','failed'),($1,'teste2','failed')",[users[0]]);assert.equal((await session(0,()=>api.POST(req(body)))).status,429);assert.equal(calls,1);
});
