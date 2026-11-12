import assert from "node:assert/strict";
import {AsyncLocalStorage} from "node:async_hooks";
import {generateKeyPairSync,sign,randomUUID} from "node:crypto";
import {readFile,writeFile,mkdir,unlink} from "node:fs/promises";
import {before,after,beforeEach,afterEach,test,mock} from "node:test";
import {PGlite} from "@electric-sql/pglite";
import {AUTONOMY_WORKFLOW} from "../lib/autonomy-oidc";
let pg:PGlite,db:typeof import("../lib/db").db,api:typeof import("../app/api/autonomy/route"),backup:Buffer|undefined;
const user="00000000-0000-4000-8000-000000000001",path="components/chat-app.tsx",{publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048}),jwk={...publicKey.export({format:"jwk"}),kid:"api-key"};let runId=9000,calls=0;
async function query(sql:string,params?:unknown[]){const r=await pg.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}
function token(){const now=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT",kid:"api-key"})).toString("base64url"),body=Buffer.from(JSON.stringify({iss:"https://token.actions.githubusercontent.com",aud:"a3x-autonomy",sub:"repo:luisgussamazon/baixardado:ref:refs/heads/main",repository:"luisgussamazon/baixardado",repository_id:"1319600283",repository_owner_id:"306209510",ref:"refs/heads/main",workflow_ref:AUTONOMY_WORKFLOW,runner_environment:"github-hosted",event_name:"workflow_dispatch",run_id:String(++runId),jti:randomUUID(),sha:"a".repeat(40),iat:now,nbf:now,exp:now+300})).toString("base64url");return head+"."+body+"."+sign("RSA-SHA256",Buffer.from(head+"."+body),privateKey).toString("base64url");}
function req(body:unknown,bearer?:string){return new Request("https://app.example/api/autonomy",{method:"POST",headers:{"Content-Type":"application/json",...(bearer?{Authorization:"Bearer "+bearer}:{})},body:JSON.stringify(body)});}
before(async()=>{await mkdir(".generated",{recursive:true});backup=await readFile(".generated/a3x-source.json").catch(()=>undefined);await writeFile(".generated/a3x-source.json",JSON.stringify({repository:"luisgussamazon/baixardado",files:[{path,sha:"a".repeat(40),content:'export const title="Original";'}]}));Object.assign(globalThis,{AsyncLocalStorage});({db}=await import("../lib/db"));api=await import("../app/api/autonomy/route");pg=new PGlite();await pg.exec((await readFile("sql/001_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;",""));for(const name of ["010_openai_luna.sql","013_autonomy_cycles.sql","013_autonomy_cycles.sql","014_astro_tasks.sql","015_astro_cycle_link.sql"])await pg.exec(await readFile("sql/"+name,"utf8"));await pg.query("INSERT INTO users(id,email,password_hash) VALUES($1,'autonomy@example.test','fixture')",[user]);});
after(async()=>{await pg.close();if(backup)await writeFile(".generated/a3x-source.json",backup);else await unlink(".generated/a3x-source.json");});
beforeEach(async()=>{calls=0;process.env.OPENAI_API_KEY="FAKE-KEY";delete process.env.A3X_AUTONOMY_ENABLED;await pg.exec("DELETE FROM astro_tasks; DELETE FROM ai_preferences; DELETE FROM autonomy_cycles; DELETE FROM ai_api_usage; UPDATE autonomy_policy SET enabled=FALSE");mock.method(db,"query",query);mock.method(db,"connect",async()=>({query,release(){}}));mock.method(globalThis,"fetch",async(url:unknown)=>{if(String(url).includes("/.well-known/jwks"))return Response.json({keys:[jwk]});calls++;const result=calls%2===1?{paths:[path],goal:"Melhorar título"}:{summary:"Título revisado",edits:[{path,oldText:'"Original"',newText:'"Revisado"'}]};return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify(result)}]}],usage:{input_tokens:100,output_tokens:20}});});});afterEach(()=>{mock.restoreAll();delete process.env.OPENAI_API_KEY;delete process.env.A3X_AUTONOMY_ENABLED;});
test("sessão ou chave comum não autoriza execução, JWT de workflow habilita ciclo e impede replay",async()=>{
 assert.equal((await api.POST(req({action:"run",enable:true}))).status,401);assert.equal((await api.POST(req({action:"run",enable:true},"FAKE-KEY"))).status,401);const jwt=token();const r=await api.POST(req({action:"run",enable:true},jwt));assert.equal(r.status,200);const data=await r.json();assert.equal(data.status,"ready");assert.equal(calls,2);assert.equal((await api.POST(req({action:"run"},jwt))).status,409);assert.equal(calls,2);assert.equal((await pg.query("SELECT * FROM ai_api_usage")).rows.length,2);assert.doesNotMatch(JSON.stringify((await pg.query("SELECT * FROM autonomy_cycles")).rows),new RegExp(jwt.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
});
test("pausa e desativação bloqueiam publicação; conclusão exige o mesmo run",async()=>{
 const jwt=token(),r=await api.POST(req({action:"run",enable:true},jwt)),data=await r.json();assert.equal((await api.POST(req({action:"authorize",id:data.id},jwt))).status,200);assert.equal((await api.POST(req({action:"authorize",id:data.id},token()))).status,409);
 assert.equal((await api.POST(req({action:"pause"},jwt))).status,200);assert.equal((await api.POST(req({action:"authorize",id:data.id},jwt))).status,409);assert.equal((await api.POST(req({action:"finish",id:data.id,status:"failed"},jwt))).status,200);assert.equal((await pg.query<{enabled:boolean}>("SELECT enabled FROM autonomy_policy")).rows[0].enabled,false);
 process.env.A3X_AUTONOMY_ENABLED="0";assert.equal((await api.POST(req({action:"run",enable:true},token()))).status,409);
});
test("limite global bloqueia antes de consumir API",async()=>{
 await pg.exec("UPDATE autonomy_policy SET enabled=TRUE");for(let i=0;i<3;i++)await pg.query("INSERT INTO autonomy_cycles(github_run_id,jti_hash,billing_user_id,base_sha,status) VALUES($1,$2,$3,$4,'no_change')",["old-"+i,"hash-"+i,user,"a".repeat(40)]);assert.equal((await api.POST(req({action:"run"},token()))).status,409);assert.equal(calls,0);
});
test("falha do provedor informa somente etapa fixa sem resposta privada ou credenciais",async()=>{
 mock.method(globalThis,"fetch",async(url:unknown)=>String(url).includes("/.well-known/jwks")?Response.json({keys:[jwk]}):new Response("secret provider response",{status:429}));
 const r=await api.POST(req({action:"run",enable:true},token()));assert.equal(r.status,409);const body=await r.json();assert.equal(body.code,"planning-provider-429");assert.doesNotMatch(JSON.stringify(body),/secret|FAKE-KEY/);assert.equal((await pg.query<{status:string}>("SELECT status FROM autonomy_cycles")).rows[0].status,"failed");
});
test("ciclo pequeno recusa múltiplas edições e pausa sem publicar",async()=>{
 mock.method(globalThis,"fetch",async(url:unknown)=>{
  if(String(url).includes("/.well-known/jwks"))return Response.json({keys:[jwk]});calls++;
  const result=calls===1?{paths:[path],goal:"Texto"}:{summary:"Texto",edits:[{path,oldText:'"Original"',newText:'"Revisado"'},{path,oldText:'"Revisado"',newText:'"Outro texto"'}]};
  return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify(result)}]}],usage:{input_tokens:100,output_tokens:20}});
 });
 const r=await api.POST(req({action:"run",enable:true},token()));assert.equal(r.status,409);assert.equal((await r.json()).code,"proposal-policy");assert.equal((await pg.query<{enabled:boolean}>("SELECT enabled FROM autonomy_policy")).rows[0].enabled,false);assert.equal((await pg.query<{status:string}>("SELECT status FROM autonomy_cycles")).rows[0].status,"failed");
});
async function astroTask(consent=true){
 if(consent)await pg.query("INSERT INTO ai_preferences(user_id,provider,cloud_consent_version,cloud_consented_at) VALUES($1,'openai',1,NOW())",[user]);
 return (await pg.query<{id:string}>("INSERT INTO astro_tasks(user_id,repository,goal) VALUES($1,'luisgussamazon/baixardado','Deixar o título mais claro') RETURNING id",[user])).rows[0].id;
}
const astro=async(id:string)=>(await pg.query<{status:string;lease_token:string|null;cycle_id:string|null}>("SELECT status,lease_token,cycle_id FROM astro_tasks WHERE id=$1",[id])).rows[0];
test("ciclo executa tarefa Astro com o objetivo do usuário até a implantação",async()=>{
 const task=await astroTask();let planInput="";
 mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{if(String(url).includes("/.well-known/jwks"))return Response.json({keys:[jwk]});calls++;if(calls===1)planInput=String(init.body);const result=calls===1?{paths:[path],goal:"Melhorar título"}:{summary:"Título revisado",edits:[{path,oldText:'"Original"',newText:'"Revisado"'}]};return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify(result)}]}],usage:{input_tokens:100,output_tokens:20}});});
 const jwt=token(),r=await api.POST(req({action:"run",enable:true},jwt)),data=await r.json();assert.equal(r.status,200);assert.equal(data.status,"ready");
 assert.match(planInput,/Deixar o título mais claro/);
 let state=await astro(task);assert.equal(state.status,"VALIDATING");assert.equal(state.cycle_id,data.id);assert.ok(state.lease_token);
 assert.equal((await api.POST(req({action:"authorize",id:data.id},jwt))).status,200);assert.equal((await astro(task)).status,"APPLYING");
 assert.equal((await api.POST(req({action:"finish",id:data.id,status:"deployed",commit:"c".repeat(40)},jwt))).status,200);
 state=await astro(task);assert.equal(state.status,"COMPLETED");assert.equal(state.lease_token,null);
 const events=(await pg.query<{status:string}>("SELECT status FROM astro_events WHERE task_id=$1 ORDER BY id",[task])).rows.map(e=>e.status);
 assert.deepEqual(events,["ANALYZING","PLANNING","CODING","VALIDATING","APPLYING","COMPLETED"]);
});
test("interrupção durante a validação bloqueia publicação sem pausar a autonomia",async()=>{
 const task=await astroTask(),jwt=token(),data=await (await api.POST(req({action:"run",enable:true},jwt))).json();
 await pg.query("UPDATE astro_tasks SET cancel_requested=TRUE WHERE id=$1",[task]);
 assert.equal((await api.POST(req({action:"authorize",id:data.id},jwt))).status,409);
 assert.equal((await api.POST(req({action:"finish",id:data.id,status:"failed"},jwt))).status,200);
 assert.equal((await astro(task)).status,"CANCELLED");assert.equal((await pg.query<{enabled:boolean}>("SELECT enabled FROM autonomy_policy")).rows[0].enabled,true);
});
test("objetivo fora do escopo encerra a tarefa sem pausar e sem gerar código",async()=>{
 const task=await astroTask();
 mock.method(globalThis,"fetch",async(url:unknown)=>{if(String(url).includes("/.well-known/jwks"))return Response.json({keys:[jwk]});calls++;return Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify({paths:[],goal:"Exige banco de dados"})}]}],usage:{input_tokens:100,output_tokens:20}});});
 const data=await (await api.POST(req({action:"run",enable:true},token()))).json();assert.equal(data.status,"no_change");assert.equal(calls,1);
 const state=await astro(task);assert.equal(state.status,"FAILED");assert.equal(state.lease_token,null);
 assert.equal((await pg.query<{enabled:boolean}>("SELECT enabled FROM autonomy_policy")).rows[0].enabled,true);
});
test("tarefa sem consentimento da Luna permanece na fila",async()=>{
 const task=await astroTask(false),data=await (await api.POST(req({action:"run",enable:true},token()))).json();
 assert.equal(data.status,"ready");const state=await astro(task);assert.equal(state.status,"PENDING");assert.equal(state.cycle_id,null);
});
