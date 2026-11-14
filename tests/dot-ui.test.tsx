import {test,before,after,afterEach,mock} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {JSDOM} from "jsdom";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import {AppRouterContext,type AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
let dom:JSDOM,ui:typeof import("@testing-library/react"),DotWorkspace:typeof import("../components/dot-workspace").default,Provider:typeof import("../components/living-agents-provider").default;
let frames:FrameRequestCallback[]=[];
const router:AppRouterInstance={back(){},forward(){},refresh(){},push(){},replace(){},prefetch(){}};
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/chat-x",pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,requestAnimationFrame:(cb:FrameRequestCallback)=>{frames.push(cb);return frames.length;},cancelAnimationFrame:()=>{},IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};createRequire(process.cwd()+"/package.json").extensions[".css"]=module=>{module.exports={__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};};ui=await import("@testing-library/react");DotWorkspace=(await import("../components/dot-workspace")).default;Provider=(await import("../components/living-agents-provider")).default;});afterEach(()=>{ui.cleanup();mock.restoreAll();frames=[];});after(()=>dom.window.close());

test("DOT uses real findings, keeps chat history and requires explicit paid settings consent",async()=>{
 let posts=0;const settings={enabled:true,luna_enabled:false,quiet:false,animations:true,main_agent:"pipo",theme:"dark",suggestion_minutes:60,last_scan_at:"2026-11-14T10:00:00Z",last_paid_at:null};
 mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{
  if(url==="/api/dot"){if(init?.method==="POST"){posts++;const b=JSON.parse(String(init.body));assert.equal(b.action,"settings");assert.equal(b.consent,true);assert.equal(b.luna_enabled,true);assert.equal(b.last_paid_at,undefined);return Response.json({ok:true});}return Response.json({settings,findings:[{id:"finding",task_id:"task",kind:"failure",code:"PLAN_TOOL_SCOPE",message:"Encontrei uma tarefa interrompida (PLAN_TOOL_SCOPE). Posso investigar?"}],tasks:[{id:"task",goal:"Fixture task",status:"failed",stage:"evolution",attempts:2,pr_number:null}],memory:{approved:2,pending:1},jobs:[],cloudConsent:true,configured:true,globalPaused:false});}
  if(url==="/api/conversations")return Response.json({conversations:[]});if(url==="/api/local-model")return Response.json({devices:[],enabled:false});return Response.json({provider:"local",available:true});
 });
 ui.render(<AppRouterContext.Provider value={router}><Provider><DotWorkspace email="fixture@example.test"/></Provider></AppRouterContext.Provider>);
 await ui.screen.findByText(/Encontrei uma tarefa interrompida/);assert.equal(posts,0,"Opening Chat X never creates paid work");
 assert.ok(ui.screen.getByRole("button",{name:"Nova conversa"}));
 assert.equal(ui.screen.getAllByRole("navigation",{name:"Navega\u00e7\u00e3o principal"}).length,1);
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Fechar mini chat"}));
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Prefer\u00eancias dos agentes"}));
 ui.fireEvent.click(ui.screen.getByRole("checkbox",{name:/Investigações autônomas com Luna/}));const save=ui.screen.getByRole("button",{name:"Salvar preferências"}) as HTMLButtonElement;assert.equal(save.disabled,true);
 ui.fireEvent.click(ui.screen.getByRole("checkbox",{name:/Autorizo investigações automáticas/}));ui.fireEvent.click(save);await ui.waitFor(()=>assert.equal(posts,1));
 assert.equal(ui.screen.queryByText(/Testes passaram|PR criado com sucesso/),null);
 ui.fireEvent.change(ui.screen.getByRole("textbox",{name:"Mensagem"}),{target:{value:"Pipo, revise seu sistema"}});ui.fireEvent.click(ui.screen.getByRole("button",{name:"Enviar mensagem"}));
 await ui.screen.findByText("Pipo · Objetivo preparado");assert.equal((ui.screen.getByRole("button",{name:"Confirmar tarefa"}) as HTMLButtonElement).disabled,true);assert.equal(posts,1,"Natural engineering request prepares consent without triggering another paid operation");
 const css=await readFile("components/dot-chat.module.css","utf8");const livingCss=await readFile("components/living-agents.module.css","utf8");assert.match(livingCss,/@media\(prefers-reduced-motion:reduce\)/);assert.match(livingCss,/animation:none!important/);assert.match(css,/max-width:760px/);
});

test("first animation frame positions robots; navigation preserves them and mini chat never sends a paid request",async()=>{
 let requests=0;mock.method(globalThis,"fetch",async(url:unknown,init?:RequestInit)=>{assert.equal(init?.method,undefined);requests++;if(url==="/api/dot")return Response.json({settings:{enabled:true,luna_enabled:false,quiet:true,animations:true,main_agent:"pipo",theme:"dark",suggestion_minutes:60},tasks:[],findings:[],memory:{approved:0,pending:0},jobs:[],globalPaused:false});return Response.json({});});
 const tree=(page:string)=><AppRouterContext.Provider value={router}><Provider><div>{page}</div></Provider></AppRouterContext.Provider>;
 const view=ui.render(tree("Chat page"));await ui.waitFor(()=>{assert.equal(requests,1);assert.ok(document.querySelector('[data-agent="pipo"]'));assert.ok(frames.length);});
 ui.act(()=>{const initial=frames.splice(0);initial.forEach(cb=>cb(16));});
 const robot=document.querySelector<HTMLElement>('[data-agent="pipo"]')!;assert.equal(robot.style.width,"132px");assert.equal(robot.style.visibility,"visible");const position=robot.style.transform;
 view.rerender(tree("Memory page"));assert.equal(document.querySelector('[data-agent="pipo"]'),robot);assert.equal(robot.style.transform,position);assert.equal(requests,1);
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Conversar com Pipo"}));ui.fireEvent.click(ui.screen.getByRole("button",{name:"Fixar"}));assert.ok(ui.screen.getByRole("button",{name:"Soltar"}));ui.fireEvent.click(ui.screen.getByRole("button",{name:"Minimizar"}));
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Mostrar agentes"}));ui.fireEvent.change(ui.screen.getByRole("textbox",{name:"Preparar pergunta no Chat"}),{target:{value:"Explique TypeScript"}});ui.fireEvent.click(ui.screen.getByRole("button",{name:"Abrir"}));assert.equal(requests,1,"mini chat only prepares a draft, never calls Luna");
});

test("memory panel opens even when there are no engineering tasks",async()=>{
 mock.method(globalThis,"fetch",async(url:unknown)=>{if(url==="/api/dot")return Response.json({settings:{enabled:true,luna_enabled:false,quiet:true,animations:false,main_agent:"pipo",theme:"dark",suggestion_minutes:60},tasks:[],findings:[],memory:{approved:3,pending:2},jobs:[],globalPaused:false});if(url==="/api/conversations")return Response.json({conversations:[]});if(url==="/api/local-model")return Response.json({devices:[],enabled:false});return Response.json({provider:"local",available:false});});
 ui.render(<AppRouterContext.Provider value={router}><Provider><DotWorkspace email="fixture@example.test"/></Provider></AppRouterContext.Provider>);await ui.waitFor(()=>assert.ok(document.querySelector('[data-agent="pipo"]')));
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Atividade e memória"}));assert.ok(ui.screen.getByText("Mimo · Memória autorizada"));assert.match(ui.screen.getByText(/registros aprovados/).textContent??"",/3.*2/);ui.fireEvent.click(ui.screen.getByRole("button",{name:"Fechar painel"}));assert.equal(ui.screen.queryByText("Mimo · Memória autorizada"),null);
});
