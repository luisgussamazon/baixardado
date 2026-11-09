import {test,before,after,afterEach,mock} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {JSDOM} from "jsdom";
let dom:JSDOM,ui:typeof import("@testing-library/react"),Browser:typeof import("../components/browser-assistant").default;
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/navegador"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});ui=await import("@testing-library/react");Browser=(await import("../components/browser-assistant")).default;});
afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("navegação depende de confirmação e não há botão para alterar estoque",async()=>{
 const calls:unknown[]=[];mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{if(init?.method==="POST"){calls.push(JSON.parse(init.body as string));return Response.json({ok:true});}return Response.json({devices:[{id:"test",online:true,observation:null}],commands:[]});});
 const confirm=mock.method(dom.window,"confirm",()=>false);const rendered=ui.render(<Browser initialCode=""/>);
 await ui.screen.findByText("Navegador conectado");ui.fireEvent.click(ui.screen.getByRole("button",{name:"schedule"}));assert.equal(calls.length,0);
 confirm.mock.mockImplementation(()=>true);ui.fireEvent.click(ui.screen.getByRole("button",{name:"schedule"}));await ui.waitFor(()=>assert.equal(calls.length,1));assert.deepEqual(calls[0],{action:"navigate",id:"test",url:"https://icqa-tool-production.up.railway.app/schedule",confirmed:true});assert.doesNotMatch(rendered.container.innerHTML,/type="password"/);assert.equal(ui.screen.queryByRole("button",{name:"Alterar estoque"}),null);
});
test("aprender requer revisão e aprovação; salva apenas na API privada existente",async()=>{
 const calls:{url:unknown;body:unknown}[]=[];mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{if(init?.method==="POST"){calls.push({url,body:JSON.parse(init.body as string)});return Response.json({entry:{id:"test"}});}return Response.json({devices:[{id:"test",online:true,observation:{url:"https://icqa-tool-production.up.railway.app/schedule",title:"Cronograma",text:"Trecho observado"}}],commands:[]});});
 const confirm=mock.method(dom.window,"confirm",()=>false);ui.render(<Browser initialCode=""/>);await ui.screen.findByText("Trecho observado");ui.fireEvent.click(ui.screen.getByRole("button",{name:"Revisar como conhecimento privado"}));ui.fireEvent.change(ui.screen.getByLabelText("Conhecimento revisado"),{target:{value:"Trecho corrigido pelo usuário"}});ui.fireEvent.click(ui.screen.getByRole("button",{name:"Aprovar e salvar conhecimento privado"}));assert.equal(calls.length,0);
 confirm.mock.mockImplementation(()=>true);ui.fireEvent.click(ui.screen.getByRole("button",{name:"Aprovar e salvar conhecimento privado"}));await ui.waitFor(()=>assert.equal(calls.length,1));assert.equal(calls[0].url,"/api/knowledge");assert.equal((calls[0].body as {answer:string}).answer,"Trecho corrigido pelo usuário");assert.equal((calls[0].body as {owner_user_id?:string}).owner_user_id,undefined);
});
