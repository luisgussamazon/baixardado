import assert from "node:assert/strict";
import { before,afterEach,mock,test } from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
let db:typeof import("../lib/db").db,page:typeof import("../app/laboratorio/page").default;
let storage:typeof import("next/dist/server/app-render/work-unit-async-storage.external").workUnitAsyncStorage;
let work:typeof import("next/dist/server/app-render/work-async-storage.external").workAsyncStorage;
let CookieStore:typeof import("next/dist/server/web/spec-extension/cookies").ResponseCookies;
before(async()=>{
  Object.assign(globalThis,{AsyncLocalStorage});
  createRequire(process.cwd()+"/package.json").extensions[".css"]=module=>{module.exports={__esModule:true,default:{}};};
  ({db}=await import("../lib/db"));page=(await import("../app/laboratorio/page")).default;
  ({workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external"));
  ({workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external"));
  ({ResponseCookies:CookieStore}=await import("next/dist/server/web/spec-extension/cookies"));
});
afterEach(()=>mock.restoreAll());
function session<T>(authenticated:boolean,fn:()=>T){const cookies=new CookieStore(new Headers());if(authenticated)cookies.set("a3x_session","local-scientific-test");return work.run({route:"/laboratorio"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,fn));}
test("laboratório exige login",async()=>{
  await assert.rejects(()=>session(false,()=>page()),(error:unknown)=>String((error as {digest:string}).digest).includes("/login"));
});
test("painel publica evidência sintética com limitações, sem executar estudo ou rede",async()=>{
  const queries=mock.method(db,"query",async()=>({rows:[{id:"local-user",email:"private@example.test"}],rowCount:1}));
  const network=mock.method(globalThis,"fetch",async()=>{throw new Error("Não consultar rede no painel");});
  const html=renderToStaticMarkup(await session(true,()=>page()));
  assert.match(html,/holdout não melhorou/);assert.match(html,/20\/24/);assert.match(html,/87,5%/);
  assert.match(html,/Nenhuma execução de estudo nesta página/);assert.match(html,/não está aplicada/);
  assert.doesNotMatch(html,/private@example.test/);assert.equal(network.mock.calls.length,0);assert.equal(queries.mock.calls.length,1);
});
