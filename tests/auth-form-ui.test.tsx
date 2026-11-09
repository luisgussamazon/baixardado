import assert from "node:assert/strict";
import {test,before,after,afterEach,mock} from "node:test";
import React from "react";
import {JSDOM} from "jsdom";
import {AppRouterContext,type AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
import AuthForm from "../components/auth-form";
let dom:JSDOM,ui:typeof import("@testing-library/react"),destination="";
const router:AppRouterInstance={back(){},forward(){},refresh(){},push(){},replace(path){destination=path;},prefetch(){}};
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/login"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});ui=await import("@testing-library/react");});
afterEach(()=>{ui.cleanup();mock.restoreAll();destination="";});after(()=>dom.window.close());
test("login mantém campos acessíveis, alterna visibilidade e envia só para API existente",async()=>{
 let calls=0;mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{calls++;assert.equal(url,"/api/login");assert.deepEqual(JSON.parse(init.body as string),{email:"local@example.test",password:"SENHA-APENAS-TESTE"});return Response.json({ok:true});});
 ui.render(<AppRouterContext.Provider value={router}><AuthForm mode="login"/></AppRouterContext.Provider>);
 const email=ui.screen.getByLabelText("E-mail"),password=ui.screen.getByLabelText("Senha");assert.equal(password.getAttribute("autocomplete"),"current-password");assert.equal(password.getAttribute("type"),"password");
 ui.fireEvent.click(ui.screen.getByRole("button",{name:"Mostrar senha"}));assert.equal(password.getAttribute("type"),"text");assert.equal(calls,0);ui.fireEvent.click(ui.screen.getByRole("button",{name:"Ocultar senha"}));assert.equal(password.getAttribute("type"),"password");
 ui.fireEvent.change(email,{target:{value:"local@example.test"}});ui.fireEvent.change(password,{target:{value:"SENHA-APENAS-TESTE"}});ui.fireEvent.click(ui.screen.getByRole("button",{name:"Entrar na A3X IA"}));await ui.waitFor(()=>assert.equal(destination,"/chat"));assert.equal(calls,1);
});
test("primeiro acesso preserva chave de configuração e exibe falhas sem perder campos",async()=>{
 mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{assert.equal(url,"/api/setup");const body=JSON.parse(init.body as string);assert.equal(body.setupKey,"CHAVE-FICTICIA-DE-TESTE");return Response.json({error:"Configuração recusada."},{status:403});});
 ui.render(<AppRouterContext.Provider value={router}><AuthForm mode="setup"/></AppRouterContext.Provider>);
 assert.equal(ui.screen.getByLabelText("Senha").getAttribute("autocomplete"),"new-password");assert.equal(ui.screen.getByLabelText("Senha").getAttribute("minlength"),"12");
 ui.fireEvent.change(ui.screen.getByLabelText("E-mail"),{target:{value:"local@example.test"}});ui.fireEvent.change(ui.screen.getByLabelText("Senha"),{target:{value:"SENHA-APENAS-TESTE"}});ui.fireEvent.change(ui.screen.getByLabelText("Chave de configuração"),{target:{value:"CHAVE-FICTICIA-DE-TESTE"}});ui.fireEvent.click(ui.screen.getByRole("button",{name:"Criar conta e começar"}));await ui.screen.findByRole("alert");assert.equal(destination,"");assert.equal((ui.screen.getByLabelText("E-mail") as HTMLInputElement).value,"local@example.test");assert.equal(ui.screen.getByRole("alert").textContent,"Configuração recusada.");
});
