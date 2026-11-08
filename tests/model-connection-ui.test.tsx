import assert from "node:assert/strict";
import { before,after,afterEach,mock,test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { JSDOM } from "jsdom";
let dom:JSDOM,ui:typeof import("@testing-library/react"),Component:typeof import("../components/model-connection").default;
before(async()=>{
  dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://app.example/conectar"});
  Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});
  createRequire(process.cwd()+"/package.json").extensions[".css"]=module=>{module.exports={__esModule:true,default:{}};};ui=await import("@testing-library/react");Component=(await import("../components/model-connection")).default;
});
afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("autorizar computador exige marcar consentimento e envia só o código da conexão",async()=>{
  let posts=0;
  mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{
    if(init?.method==="POST"){posts++;assert.deepEqual(JSON.parse(String(init.body)),{action:"approve",code:"123456ABCDEF",confirmed:true});return Response.json({ok:true});}
    return Response.json({devices:[],enabled:true});
  });
  ui.render(<Component initialCode="123456ABCDEF"/>);
  const button=ui.screen.getByRole("button",{name:"Autorizar meu computador"}) as HTMLButtonElement;
  assert.equal(button.disabled,true);assert.equal(posts,0);
  ui.fireEvent.click(ui.screen.getByRole("checkbox"));assert.equal(button.disabled,false);ui.fireEvent.click(button);
  await ui.screen.findByText("Autorizado. O computador deve ficar online em alguns segundos.");assert.equal(posts,1);
});
test("erro de sessão é mostrado sem conectar automaticamente",async()=>{
  mock.method(globalThis,"fetch",async()=>Response.json({error:"Faça login."},{status:401}));
  ui.render(<Component initialCode=""/>);assert.match((await ui.screen.findByRole("alert")).textContent!,/Faça login/);
  assert.equal((ui.screen.getByRole("button",{name:"Autorizar meu computador"}) as HTMLButtonElement).disabled,true);
});
