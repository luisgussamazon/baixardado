import assert from "node:assert/strict";
import { before, after, afterEach, mock, test } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { readFile, writeFile } from "node:fs/promises";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import ProgrammerApp from "../components/programmer-app";

let dom:JSDOM;
let ui:typeof import("@testing-library/react");
const router:AppRouterInstance={back(){},forward(){},refresh(){},push(){},replace(){},prefetch(){}};
const id="00000000-0000-4000-8000-000000000001";
const project={id,name:"Projeto local",summary:"Sistema para teste",description:"Sistema simples",status:"ready",created_at:"2026-11-08T00:00:00Z",files:[
  {path:"README.md",content:"# Projeto local\nComo instalar"},
  {path:"src/app.ts",content:'const mensagem = "<script>window.codigoExecutado=true</script>";'},
]};
before(async()=>{
  dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://app.example/programador"});
  Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,
    HTMLAnchorElement:dom.window.HTMLAnchorElement,MutationObserver:dom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT:true});
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});
  dom.window.confirm=()=>true;
  ui=await import("@testing-library/react");
});
afterEach(()=>{ui.cleanup();mock.restoreAll();});
after(()=>dom.window.close());

function transport(options:{failure?:boolean;empty?:boolean}={}){
  return mock.method(globalThis,"fetch",async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input);
    if(url.endsWith("/download"))return new Response(new Uint8Array([80,75]),{headers:{"content-type":"application/zip"}});
    if(url==="/api/projects"&&init?.method==="POST"){
      assert.deepEqual(JSON.parse(String(init.body)),{description:"Meu sistema de tarefas",confirmWeb:true});
      return new Response(options.failure?'event: failure\ndata: {"message":"Cota local atingida"}\n\n':
        `event: started\ndata: {"id":"${id}"}\n\nevent: done\ndata: {"id":"${id}"}\n\n`);
    }
    if(url==="/api/projects")return Response.json({projects:options.empty?[]:[project]});
    if(url===`/api/projects/${id}`)return Response.json({project});
    if(url==="/api/logout")return Response.json({ok:true});
    throw new Error("URL de teste inesperada");
  });
}
function render(){
  try {return ui.render(<AppRouterContext.Provider value={router}><ProgrammerApp email="local@example.test" appName="A3X AI"/></AppRouterContext.Provider>);}
  catch(error){if(error instanceof AggregateError)throw new Error(error.errors.map(e=>String(e)).join("\n"));throw error;}
}

test("interface apresenta modos, árvore, código seguro, cópia e ZIP",async()=>{
  const requests=transport();
  let copied="",filename="";
  Object.assign(navigator,{clipboard:{writeText:async(value:string)=>{copied=value;}}});
  mock.method(URL,"createObjectURL",()=>"blob:local-test");mock.method(URL,"revokeObjectURL",()=>{});
  mock.method(dom.window.HTMLAnchorElement.prototype,"click",function(this:HTMLAnchorElement){filename=this.download;});
  const view=render();
  assert.equal(view.getByRole("link",{name:"Chat"}).getAttribute("href"),"/chat");
  assert.equal(view.getByRole("link",{name:"Programador"}).getAttribute("aria-current"),"page");
  assert.equal(view.getByLabelText("O que você quer construir?").getAttribute("maxlength"),"4000");
  assert.equal((view.getByRole("button",{name:/Pesquisar e criar base/}) as HTMLButtonElement).disabled,true);
  ui.fireEvent.click(await view.findByRole("button",{name:"Abrir projeto Projeto local"}));
  await view.findByRole("heading",{name:"Projeto local"});
  ui.fireEvent.click(view.getByRole("button",{name:"app.ts"}));
  const code=view.getByLabelText("Código de src/app.ts");
  assert.equal(code.textContent,project.files[1].content);
  assert(code.querySelector(".hljs-keyword"));
  assert.equal(code.querySelector("script"),null);
  assert.equal((window as unknown as {codigoExecutado?:boolean}).codigoExecutado,undefined);
  if(process.env.A3X_UI_PREVIEW==="1"){
    const css=(await readFile("app/globals.css","utf8")).replace(/^@import[^\n]*\n/,"");
    await writeFile(".tools/programmer-preview.html",`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${view.container.innerHTML}</body></html>`);
  }
  ui.fireEvent.click(view.getByRole("button",{name:"Copiar código do arquivo"}));
  await ui.waitFor(()=>assert.equal(copied,project.files[1].content));
  ui.fireEvent.click(view.getByRole("button",{name:/Baixar ZIP/}));
  await ui.waitFor(()=>assert.equal(filename,`a3x-projeto-${id}.zip`));
  assert(requests.mock.calls.some(call=>String(call.arguments[0]).endsWith("/download")));
});

test("interface gera projeto e abre arquivos somente depois de receber done",async()=>{
  transport({empty:true});const view=render();
  ui.fireEvent.change(view.getByLabelText("O que você quer construir?"),{target:{value:"Meu sistema de tarefas"}});
  ui.fireEvent.click(view.getByRole("button",{name:/Pesquisar e criar base/}));
  await view.findByRole("heading",{name:"Projeto local"});
  assert.equal((view.getByLabelText("O que você quer construir?") as HTMLTextAreaElement).value,"");
  assert(view.getByRole("button",{name:/Baixar ZIP/}));
});

test("interface mostra erro, mantém descrição e permite nova tentativa sem código parcial",async()=>{
  transport({failure:true,empty:true});const view=render();
  ui.fireEvent.change(view.getByLabelText("O que você quer construir?"),{target:{value:"Meu sistema de tarefas"}});
  ui.fireEvent.click(view.getByRole("button",{name:/Pesquisar e criar base/}));
  await view.findByRole("alert");
  assert.match(view.getByRole("alert").textContent!,/Cota local atingida/);
  assert.equal((view.getByLabelText("O que você quer construir?") as HTMLTextAreaElement).value,"Meu sistema de tarefas");
  await ui.waitFor(()=>assert.equal((view.getByRole("button",{name:/Pesquisar e criar base/}) as HTMLButtonElement).disabled,false));
  assert.equal(view.queryByRole("button",{name:/Baixar ZIP/}),null);
});
