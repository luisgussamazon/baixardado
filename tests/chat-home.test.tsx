import assert from "node:assert/strict";
import {test,before,after,afterEach,mock} from "node:test";
import React from "react";
import {JSDOM} from "jsdom";
import {AppRouterContext,type AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
import ChatApp from "../components/chat-app";
let dom:JSDOM,ui:typeof import("@testing-library/react");
const router:AppRouterInstance={back(){},forward(){},refresh(){},push(){},replace(){},prefetch(){}};
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/chat"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};ui=await import("@testing-library/react");});
afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("atalhos preparam solicitação sem consumir API e preservam acesso aos projetos",async()=>{
 let posts=0;mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{if(init?.method==="POST")posts++;if(url==="/api/conversations")return Response.json({conversations:[]});if(url==="/api/local-model")return Response.json({enabled:false,devices:[]});return Response.json({provider:"local",available:true});});
 ui.render(<AppRouterContext.Provider value={router}><ChatApp email="local@example.test" appName="A3X AI"/></AppRouterContext.Provider>);
 await ui.waitFor(()=>assert.equal((ui.screen.getByRole("option",{name:"GPT-6 Luna"}) as HTMLOptionElement).disabled,false));
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Gerar relatório"}));const input=ui.screen.getByLabelText("Mensagem") as HTMLTextAreaElement;assert.match(input.value,/objetivo e os dados necessários/);assert.equal(dom.window.document.activeElement,input);assert.equal(posts,0);
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Análises"}));assert.match(input.value,/Vou fornecer os dados/);assert.equal(posts,0);
 assert.equal(ui.screen.getByRole("link",{name:"Apoio em projetos"}).getAttribute("href"),"/programador");assert.equal(ui.screen.getByRole("link",{name:"Configurações"}).getAttribute("href"),"/memoria");
});
