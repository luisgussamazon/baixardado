import assert from "node:assert/strict";
import {test,before,after,afterEach,mock} from "node:test";
import React from "react";
import {JSDOM} from "jsdom";
import Studio from "../components/source-studio";
let dom:JSDOM,ui:typeof import("@testing-library/react");
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/desenvolver"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});ui=await import("@testing-library/react");});
afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("geração exige objetivo, seleção e consentimento; proposta aparece sem aplicar código",async()=>{
 let posts=0;mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{if(init?.method==="POST"){posts++;assert.deepEqual(JSON.parse(init.body as string),{goal:"Melhorar título",paths:["components/chat-app.tsx"],consent:true});return Response.json({id:"test",proposal:{summary:"Título proposto",files:[],edits:[{path:"components/chat-app.tsx",oldText:"Original",newText:"Revisado"}]}});}return Response.json({files:[{path:"components/chat-app.tsx",chars:100,writable:true},{path:"lib/security.ts",chars:50,writable:false}],proposals:[]});});
 ui.render(<Studio/>);await ui.screen.findByText("components/chat-app.tsx");const button=ui.screen.getByRole("button",{name:"Gerar proposta com GPT-6 Luna"}) as HTMLButtonElement;assert.equal(button.disabled,true);
 ui.fireEvent.change(ui.screen.getByLabelText("Descreva a alteração"),{target:{value:"Melhorar título"}});ui.fireEvent.click(ui.screen.getByLabelText("components/chat-app.tsx"));assert.equal(button.disabled,true);assert.equal((ui.screen.getByLabelText("lib/security.ts · leitura") as HTMLInputElement).disabled,true);assert.equal(posts,0);
 ui.fireEvent.click(ui.screen.getByLabelText(/Autorizo enviar meu objetivo/));ui.fireEvent.click(button);await ui.screen.findByText("Título proposto");assert.equal(posts,1);assert.ok(ui.screen.getByText("Original"));assert.ok(ui.screen.getByText("Revisado"));assert.match(ui.screen.getByRole("link",{name:"Baixar proposta JSON"}).getAttribute("href")!,/\/api\/source\//);assert.equal(ui.screen.queryByRole("button",{name:"Publicar"}),null);
});
