import {test,before,after,afterEach,mock} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {JSDOM} from "jsdom";
let dom:JSDOM,ui:typeof import("@testing-library/react"),Switch:typeof import("../components/model-provider-switch").default;
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/chat"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});ui=await import("@testing-library/react");Switch=(await import("../components/model-provider-switch")).default;});
afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("cancelar consentimento não salva; aprovação escolhe nuvem; voltar ao local dispensa confirmação",async()=>{
 const bodies:unknown[]=[];let chosen="local";
 mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{if(init?.method==="POST"){bodies.push(JSON.parse(init.body as string));return Response.json({provider:JSON.parse(init.body as string).provider});}return Response.json({provider:"local",available:true});});
 const confirm=mock.method(dom.window,"confirm",(text:string)=>{assert.match(text,/histórico recente/);assert.match(text,/US\$5/);return false;});
 ui.render(<Switch disabled={false} onChange={value=>{chosen=value;}}/>);
 await ui.waitFor(()=>assert.equal((ui.screen.getByRole("option",{name:"GPT-6 Luna"}) as HTMLOptionElement).disabled,false));
 ui.fireEvent.change(ui.screen.getByLabelText("Modelo de IA"),{target:{value:"openai"}});assert.equal(bodies.length,0);assert.equal(chosen,"local");
 confirm.mock.mockImplementation(()=>true);ui.fireEvent.change(ui.screen.getByLabelText("Modelo de IA"),{target:{value:"openai"}});await ui.waitFor(()=>assert.equal(chosen,"openai"));assert.deepEqual(bodies[0],{provider:"openai",consent:true});
 ui.fireEvent.change(ui.screen.getByLabelText("Modelo de IA"),{target:{value:"local"}});await ui.waitFor(()=>assert.equal(chosen,"local"));assert.equal(confirm.mock.callCount(),2);assert.deepEqual(bodies[1],{provider:"local",consent:false});
});
