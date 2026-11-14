import {test,before,after,afterEach,mock} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {JSDOM} from "jsdom";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import {AppRouterContext,type AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
let dom:JSDOM,ui:typeof import("@testing-library/react"),DotWorkspace:typeof import("../components/dot-workspace").default;
const router:AppRouterInstance={back(){},forward(){},refresh(){},push(){},replace(){},prefetch(){}};
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/chat-x"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};createRequire(process.cwd()+"/package.json").extensions[".css"]=module=>{module.exports={__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};};ui=await import("@testing-library/react");DotWorkspace=(await import("../components/dot-workspace")).default;});afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());

test("DOT uses real findings, keeps chat history and requires explicit paid settings consent",async()=>{
 let posts=0;const settings={enabled:true,luna_enabled:false,quiet:false,animations:true,main_agent:"pipo",theme:"dark",suggestion_minutes:60,last_scan_at:"2026-11-14T10:00:00Z",last_paid_at:null};
 mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{
  if(url==="/api/dot"){if(init?.method==="POST"){posts++;const b=JSON.parse(String(init.body));assert.equal(b.action,"settings");assert.equal(b.consent,true);assert.equal(b.luna_enabled,true);assert.equal(b.last_paid_at,undefined);return Response.json({ok:true});}return Response.json({settings,findings:[{id:"finding",task_id:"task",kind:"failure",code:"PLAN_TOOL_SCOPE",message:"Encontrei uma tarefa interrompida (PLAN_TOOL_SCOPE). Posso investigar?"}],tasks:[{id:"task",goal:"Fixture task",status:"failed",stage:"evolution",attempts:2,pr_number:null}],memory:{approved:2,pending:1},jobs:[],cloudConsent:true,configured:true,globalPaused:false});}
  if(url==="/api/conversations")return Response.json({conversations:[]});if(url==="/api/local-model")return Response.json({devices:[],enabled:false});return Response.json({provider:"local",available:true});
 });
 ui.render(<AppRouterContext.Provider value={router}><DotWorkspace email="fixture@example.test"/></AppRouterContext.Provider>);
 await ui.screen.findByText(/Encontrei uma tarefa interrompida/);assert.equal(posts,0,"Opening Chat X never creates paid work");
 assert.ok(ui.screen.getByRole("combobox",{name:"Histórico do Chat"}));
 ui.fireEvent.click(ui.screen.getByRole("button",{name:/Bubu/}));assert.ok(ui.screen.getByText("Tarefa interrompida"));
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Minimizar"}));assert.ok(ui.screen.getByRole("button",{name:"Mostrar Bubu"}));ui.fireEvent.click(ui.screen.getByRole("button",{name:"Mostrar Bubu"}));
 const move=ui.screen.getByRole("button",{name:"Mover personagem"});ui.fireEvent.keyDown(move,{key:"ArrowRight"});assert.ok(move);
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Meus agentes"}));
 ui.fireEvent.click(ui.screen.getByRole("checkbox",{name:/Nível 2/}));const save=ui.screen.getByRole("button",{name:"Salvar preferências"}) as HTMLButtonElement;assert.equal(save.disabled,true);
 ui.fireEvent.click(ui.screen.getByRole("checkbox",{name:/Autorizo investigações automáticas/}));ui.fireEvent.click(save);await ui.waitFor(()=>assert.equal(posts,1));
 assert.equal(ui.screen.queryByText(/Testes passaram|PR criado com sucesso/),null);
 ui.fireEvent.change(ui.screen.getByRole("textbox",{name:"Mensagem"}),{target:{value:"Pipo, revise seu sistema"}});ui.fireEvent.click(ui.screen.getByRole("button",{name:"Enviar mensagem"}));
 await ui.screen.findByText("Pipo · Objetivo preparado");assert.equal((ui.screen.getByRole("button",{name:"Confirmar tarefa"}) as HTMLButtonElement).disabled,true);assert.equal(posts,1,"Natural engineering request prepares consent without triggering another paid operation");
 const css=await readFile("components/dot-workspace.module.css","utf8");assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none!important/);assert.match(css,/max-width:760px/);
});
