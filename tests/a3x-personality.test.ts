import assert from "node:assert/strict";
import test from "node:test";
import {enhanceA3XReply} from "../lib/a3x-personality";

const reply=(message:string,history:{role:"user"|"assistant";content:string}[]=[],original="Resposta local.",opts:{hasKnowledge?:boolean;tone?:"executivo"|"acolhedor"|"objetivo"}={})=>
  enhanceA3XReply({message,history,decision:{kind:"reply",text:original},original,hasKnowledge:opts.hasKnowledge??false,tone:opts.tone});

test("variação de cumprimentos sem alegar humanidade",()=>{
  const a=reply("oi");const b=reply("oi",[{role:"user",content:"anterior"}]);
  assert.match(a,/A3X|Olá/);assert.match(b,/Olá/);
  assert.doesNotMatch(a+b,/sou humano|sou consciente|tenho sentimentos/i);
});
test("a mesma entrada e contexto geram resposta determinística",()=>{
  assert.equal(reply("Olá"),reply("Olá"));
});
test("pedidos explícitos de pesquisa não são modificados",()=>{
  const original="## Pesquisa na web\n\n[Fonte](https://example.org)";
  assert.equal(enhanceA3XReply({message:"pesquise Node.js",history:[],decision:{kind:"search",query:"Node.js"},original,hasKnowledge:false}),original);
});
test("conteúdo da base é preservado literalmente e sugere um único próximo passo",()=>{
  const original="Resposta validada [Fonte](https://example.org)";
  const output=reply("como configurar Git?",[],original,{hasKnowledge:true});
  assert.ok(output.startsWith(original));assert.match(output,/próximos passos/);
});
test("mantém respostas sensíveis, matemáticas e de identidade",()=>{
  for(const message of ["Estou triste e ansiosa","Quanto é 2+2?","Você é humano?","esqueça meu nome","qual meu nome?","qual minha senha?","Me mostre minha API_KEY"]){
    assert.equal(reply(message,[],"Resposta original"),"Resposta original",message);
  }
});
test("continuidade usa somente histórico recente da conversa atual",()=>{
  const history=[{role:"user" as const,content:"O que é Railway?"},{role:"assistant" as const,content:"É a hospedagem."}];
  assert.match(reply("Como faço?",history),/Deploy Logs/);
  assert.equal(reply("Como faço?"),"Resposta local.");
});
test("referências específicas de pull request não fazem merge",()=>{
  const value=reply("como criar pull request?");
  assert.match(value,/merge automaticamente/);
  assert.match(reply("continue",[{role:"user",content:"como criar PR"}]),/base: main/);
});
test("assuntos de custos distinguem API e hospedagem",()=>{
  assert.match(reply("Como ter minha IA gratis?"),/hospedagem/);
  assert.match(reply("e depois?",[{role:"user",content:"quero IA sem pagar"}]),/consumo/);
});
test("orientações de código não prometem gerar projeto completo por regras",()=>{
  const text=reply("quero criar codigo fonte para meu sistema");
  assert.match(text,/Sem modelo generativo/);
});
test("não encaminha perguntas de saudação para web",()=>{
  assert.doesNotMatch(reply("bom dia"),/https?:\/\//);
});
test("falta de conhecimento permanece com resposta honesta",()=>{
  const original="Não encontrei resposta. Quer que eu pesquise fontes sobre isso?";
  const decision={kind:"reply" as const,text:original,knowledgeQuery:"tema desconhecido"};
  const result=enhanceA3XReply({message:"Explique elementos transurânicos",history:[],decision,original,hasKnowledge:false});
  assert.match(result,/Não encontrei resposta/);
});
