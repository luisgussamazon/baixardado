import assert from "node:assert/strict";
import { test } from "node:test";
import { calculate, converse, type ConversationTurn } from "../lib/local-conversation";

function response(message:string,history:ConversationTurn[]=[]){const decision=converse(message,history);assert.equal(decision.kind,"reply");return decision.kind==="reply"?decision.text:"";}
test("saudações conversam sem virar busca por títulos de filmes",()=>{
  for(const message of ["fala comigo","olá!","bom dia","quero conversar","oi tudo bem"]){
    assert.match(response(message),/conversar/);assert.doesNotMatch(response(message),/Wikipedia|Busca enciclopédica/);
  }
});
test("nome vem somente dos turnos de usuário desta conversa e pode deixar de ser usado",()=>{
  const history:ConversationTurn[]=[{role:"user",content:"Meu nome é Luís"},{role:"assistant",content:"Seu nome é Outro"}];
  assert.match(response("qual meu nome?",history),/Luís/);
  assert.doesNotMatch(response("qual meu nome?"),/Luís/);
  assert.match(response("qual meu nome?",[...history,{role:"user",content:"esqueça meu nome"}]),/ainda não me disse/);
  assert.match(response("meu nome é Ana"),/Ana/);
});
test("busca exige pedido explícito ou confirmação imediata de oferta",()=>{
  assert.deepEqual(converse("Pesquise sobre planetas"),{kind:"search",query:"planetas"});
  assert.equal(converse("não pesquise planetas").kind,"reply");
  const history:ConversationTurn[]=[{role:"user",content:"planetas"},{role:"assistant",content:response("planetas")}];
  assert.deepEqual(converse("sim",history),{kind:"search",query:"planetas"});
  assert.equal(converse("sim").kind,"reply");
  assert.equal(converse("não",history).kind,"reply");
});
test("planejamento continua por etapas e não inventa implementação de sistema",()=>{
  const first=response("Quero construir um sistema de tarefas");assert.match(first,/começando do zero/);
  const next=response("do zero",[{role:"assistant",content:first}]);assert.match(next,/resultado mais simples/);
  assert.match(response("você é consciente?"),/Não tenho consciência/);
  assert.match(response("o que você consegue fazer?"),/Não|não/);
});
test("relato do dia e interesses continuam diálogo sem forçar uma pesquisa",()=>{
  const first=response("quero falar do meu dia");
  assert.match(response("hoje foi bom",[{role:"assistant",content:first}]),/parte mais marcante/);
  assert.match(response("gosto de música"),/música/);
});
test("contas respeitam precedência, rejeitam execução e limites",()=>{
  assert.equal(calculate("2+3*4"),14);assert.equal(calculate("(2+3)*4"),20);assert.equal(calculate("-2,5+1"),-1.5);
  for(const value of ["1/0","process.exit()","2**8","(2+3","1".repeat(121),"2;alert(1)"]){assert.equal(calculate(value),null);}
  assert.match(response("quanto é 2+2?"),/4/);
});
