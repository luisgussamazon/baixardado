import assert from "node:assert/strict";
import {test,before,after,afterEach,mock} from "node:test";
import React from "react";
import {JSDOM} from "jsdom";
import Status from "../components/autonomy-status";
let dom:JSDOM,ui:typeof import("@testing-library/react");
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/autonomia"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});ui=await import("@testing-library/react");});afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("painel usa estado real e não dá permissão de publicar a uma sessão comum",async()=>{
 let enabled=false;mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{assert.notEqual(init?.method,"POST");return Response.json({policy:{enabled},serverDisabled:false,runs:[]});});ui.render(<Status/>);await ui.screen.findByText("Autonomia pausada");assert.equal(ui.screen.queryByRole("button",{name:/Gerar proposta|Publicar|Aplicar/}),null);enabled=true;ui.fireEvent.click(ui.screen.getByRole("button",{name:"Atualizar estado"}));await ui.screen.findByText("Autonomia ativa");assert.ok(ui.screen.getByRole("link",{name:"Execuções no GitHub"}));
});
