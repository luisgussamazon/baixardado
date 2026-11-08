import {test} from "node:test";
import assert from "node:assert/strict";
import {validateKnowledge} from "../lib/knowledge-validation";
const valid={topic:"Git",title:"Criar commit",question:"Como fazer um commit?",answer:"Confira git status e registre apenas arquivos autorizados.",keywords:["git","commit"],source_url:"https://git-scm.com/docs"};
test("aceita registro autorizado",()=>assert.equal(validateKnowledge(valid)?.topic,"Git"));
test("permite resposta detalhada em múltiplas linhas",()=>{
 assert.equal(validateKnowledge({...valid,answer:"Primeiro passo\nSegundo passo"})?.answer,"Primeiro passo\nSegundo passo");
});
test("rejeita URL insegura e credenciais embutidas",()=>{
 for(const source_url of ["http://example.com/a","file:///etc/passwd","https://usuario:senha@example.com","javascript:alert(1)"])
  assert.equal(validateKnowledge({...valid,source_url}),null);
});
test("rejeita conteúdo vazio, controle e tamanho fora do limite",()=>{
 assert.equal(validateKnowledge({...valid,answer:""}),null);
 assert.equal(validateKnowledge({...valid,answer:"a".repeat(4001)}),null);
 assert.equal(validateKnowledge({...valid,title:"a\nscript"}),null);
 assert.equal(validateKnowledge({...valid,keywords:Array(11).fill("ok")}),null);
});
