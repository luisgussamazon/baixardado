import {test,before,after,afterEach} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {JSDOM} from "jsdom";
import {assistantPresentation} from "../lib/answer-presentation";
let dom:JSDOM,ui:typeof import("@testing-library/react"),Answer:typeof import("../components/assistant-answer").default;
const warning="_Gerado pelo modelo aberto Qwen3 4B no seu computador. Pode conter erros; confira informações importantes._";
before(async()=>{dom=new JSDOM("<html><body></body></html>",{url:"https://app.example/chat"});Object.assign(globalThis,{window:dom.window,self:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,"navigator",{configurable:true,value:dom.window.navigator});ui=await import("@testing-library/react");Answer=(await import("../components/assistant-answer")).default;});
afterEach(()=>ui.cleanup());after(()=>dom.window.close());
test("histórico antigo mostra apenas resposta e recolhe fontes sem alterar conteúdo salvo",()=>{
  const original="**Consulta documental privada — trechos literais**\n\nO modelo auxilia a priorizar fontes; a resposta abaixo preserva o texto fornecido, sem acrescentar interpretações operacionais.\n\n### [L1] inventory-flow.md · Fluxo\n\n> - **FOUND** indica sobra.\n\nA documentação pode estar desatualizada ou contraditória. Nenhuma tela autenticada foi verificada e nenhuma ação de estoque foi executada.\n\n"+warning;
  const answer=assistantPresentation(original);assert.equal(answer.text,"FOUND indica sobra.");assert.match(answer.sources,/inventory-flow/);assert.match(original,/A documentação pode/);
  const rendered=ui.render(<Answer>{original}</Answer>);assert.ok(ui.screen.getByText("FOUND indica sobra."));assert.doesNotMatch(rendered.container.textContent!,/Gerado pelo modelo|O modelo auxilia|A documentação pode|Consulta documental/);
  const details=rendered.container.querySelector("details")!;assert.equal(details.open,false);assert.equal(details.querySelector("summary")?.textContent,"Fontes");
});
test("resposta e cópia ficam sem rodapé; fontes permanecem disponíveis",()=>{
  const content="Abra Cronograma e escolha a data.\n\n"+warning+"\n\n**Fontes:**\n- manual.md";
  const result=assistantPresentation(content);assert.equal(result.text,"Abra Cronograma e escolha a data.");assert.match(result.sources,/manual.md/);
  const rendered=ui.render(<Answer>{content}</Answer>);assert.equal(rendered.container.querySelector("details")?.open,false);
});
test("preserva incerteza pertinente e código, incluindo marcadores dentro de exemplos",()=>{
  const content="Não tenho dados para confirmar esse saldo.\n\n```md\n**Fontes:**\n- exemplo\n\n"+warning+"\n```";
  assert.deepEqual(assistantPresentation(content),{text:content,sources:""});
});
