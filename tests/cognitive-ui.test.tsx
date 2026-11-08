import assert from "node:assert/strict";
import { before,after,afterEach,mock,test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { JSDOM } from "jsdom";
let dom:JSDOM,ui:typeof import("@testing-library/react"),Component:typeof import("../components/cognitive-memory").default;
before(async()=>{
  dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://app.example/memoria"});
  Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});
  createRequire(process.cwd()+"/package.json").extensions[".css"]=module=>{module.exports={__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};};
  ui=await import("@testing-library/react");Component=(await import("../components/cognitive-memory")).default;
});
afterEach(()=>{ui.cleanup();mock.restoreAll();});after(()=>dom.window.close());
test("memória exige aprovação confirmada e permite cancelar sem mutação",async()=>{
  const entry={id:"00000000-0000-4000-8000-000000000001",kind:"fact",label:"Idioma",value:"Português",question:null,status:"pending"};
  let approved=false,calls=0;
  mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{
    if(init?.method==="PATCH"){calls++;assert.deepEqual(JSON.parse(String(init.body)),{action:"approve"});approved=true;return Response.json({record:{id:entry.id,status:"approved"}});}
    return Response.json({records:[{...entry,status:approved?"approved":"pending"}]});
  });
  const confirm=mock.method(dom.window,"confirm",()=>false);
  ui.render(<Component/>);await ui.screen.findByText("Idioma");
  ui.fireEvent.click(ui.screen.getByRole("button",{name:"Aprovar"}));assert.equal(calls,0);
  confirm.mock.mockImplementation(()=>true);
  ui.fireEvent.click(ui.screen.getByRole("button",{name:"Aprovar"}));
  await ui.screen.findByText("Registro aprovado para uso privado.");assert.equal(calls,1);
});
test("falha no carregamento de memória aparece sem expor conteúdo de outras contas",async()=>{
  mock.method(globalThis,"fetch",async()=>Response.json({error:"Faça login."},{status:401}));
  ui.render(<Component/>);assert.match((await ui.screen.findByRole("alert")).textContent!,/Faça login/);
  assert.equal(ui.screen.queryByText("Idioma"),null);
});
test("identidade de criador só é salva e aprovada após confirmação do nome",async()=>{
  const records:unknown[]=[];let writes=0;
  mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>{
    if(init?.method==="POST"){writes++;const body=JSON.parse(String(init.body));assert.equal(body.label,"Criador do A3X AI");assert.equal(body.value,"Criador Teste");return Response.json({record:{id:"creator-test",...body,status:"pending"}});}
    if(init?.method==="PATCH"){writes++;records.push({id:"creator-test",kind:"fact",label:"Criador do A3X AI",value:"Criador Teste",status:"approved"});return Response.json({record:{id:"creator-test",status:"approved"}});}
    return Response.json({records});
  });
  const confirm=mock.method(dom.window,"confirm",()=>false);ui.render(<Component/>);
  await ui.screen.findByText("Nenhum registro. O histórico de conversas não é aprendido automaticamente.");
  ui.fireEvent.change(ui.screen.getByLabelText("Seu nome como criador"),{target:{value:"Criador Teste"}});
  ui.fireEvent.click(ui.screen.getByRole("button",{name:"Salvar e aprovar meu perfil de criador"}));assert.equal(writes,0);
  confirm.mock.mockImplementation(()=>true);ui.fireEvent.click(ui.screen.getByRole("button",{name:"Salvar e aprovar meu perfil de criador"}));
  await ui.screen.findByText("Identidade de criador aprovada. Experimente perguntar no Chat quem criou o A3X.");assert.equal(writes,2);
});
