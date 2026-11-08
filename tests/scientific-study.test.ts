import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { RESEARCH_POLICY } from "../config/research-policy";
import benchmark from "../research/autonomia-v1/benchmark.json";
import evidence from "../research/autonomia-v1/results/demonstration.json";
import { classify,validatePolicy,type Case } from "../lib/research/classifier";
import { runStudy,proposePolicy,validateDataset,wilson,LIMITS } from "../lib/research/study";
import { validateCandidate,renderPolicy,policyPatch,POLICY_TARGET } from "../lib/research/proposal";
import { decide } from "../lib/cognitive/engine";

test("benchmark preservado confere com manifesto SHA-256 fornecido",async()=>{
  const manifest=JSON.parse(await readFile("research/autonomia-v1/PACKAGE-MANIFEST.json","utf8"));
  const raw=await readFile("research/autonomia-v1/benchmark.json");
  assert.equal(createHash("sha256").update(raw).digest("hex"),manifest.files["data/benchmark.json"].sha256);
  assert.equal(raw.length,manifest.files["data/benchmark.json"].bytes);
});
test("estudo reproduz 125 casos, onze ajustes e nenhum ganho no holdout",()=>{
  const before=structuredClone(RESEARCH_POLICY),data=structuredClone(benchmark),report=runStudy(data,RESEARCH_POLICY);
  assert.deepEqual(RESEARCH_POLICY,before);assert.deepEqual(data,benchmark);
  assert.deepEqual([report.original.train.correct,report.candidate.train.correct],[36,60]);
  assert.deepEqual([report.original.validation.correct,report.candidate.validation.correct],[3,21]);
  assert.deepEqual([report.original.holdout.correct,report.candidate.holdout.correct],[20,20]);
  assert.deepEqual([report.original.guardrails.correct,report.candidate.guardrails.correct],[13,13]);
  assert.equal(report.changes.length,11);assert.equal(report.decision.generalizationDemonstrated,false);
  assert.equal(report.paired.holdout.exactMcNemarP,1);assert.equal(report.paired.validation.improved,18);
  assert.deepEqual(report.original,evidence.original);assert.deepEqual(report.candidate,evidence.candidate);
});
test("holdout não altera proposta nem seleção; treino é a única fonte de palavras",()=>{
  const modified=structuredClone(benchmark);modified.holdout[0]={text:"caso externo reservado ortogonal",intent:"git"};
  const one=runStudy(benchmark,RESEARCH_POLICY),two=runStudy(modified,RESEARCH_POLICY);
  assert.deepEqual(one.proposedPolicy,two.proposedPolicy);assert.deepEqual(one.changes,two.changes);
  assert.equal(one.decision.selectedForHumanReview,two.decision.selectedForHumanReview);
  assert.deepEqual(proposePolicy(RESEARCH_POLICY,benchmark.train as Case[]).changes,one.changes);
});
test("controle com falha impede recomendação mesmo com grande ganho na validação",()=>{
  const data=structuredClone(benchmark);data.guardrails.push({text:"teste adversarial sem correspondencia",intent:"git"});
  const report=runStudy(data,RESEARCH_POLICY);assert.equal(report.decision.safetyPreserved,false);assert.equal(report.decision.selectedForHumanReview,false);
});
test("estudo rejeita vazamento entre partições, tipos, tamanhos e categorias inventadas",()=>{
  const duplicate=structuredClone(benchmark);duplicate.validation[0]=duplicate.train[0];
  assert.throws(()=>validateDataset(duplicate),/Vazamento/);
  for(const bad of [null,{}, {...benchmark,train:Array(257).fill(benchmark.train[0])},{...benchmark,extra:[]},{...benchmark,train:[{text:"a",intent:"admin_root"}]},{...benchmark,train:[{text:"a".repeat(4001),intent:"git"}]}])assert.throws(()=>validateDataset(bad));
  assert.throws(()=>runStudy(benchmark,RESEARCH_POLICY,-1),/Tempo/);
  assert.throws(()=>validatePolicy({...RESEARCH_POLICY,execute:"payload"}));
});
test("proposta determinística só pode acrescentar até três tokens por categoria",()=>{
  const one=runStudy(benchmark,RESEARCH_POLICY),two=runStudy(benchmark,RESEARCH_POLICY);
  assert.deepEqual(one,two);validateCandidate(RESEARCH_POLICY,one.proposedPolicy);
  const malformed=structuredClone(one.proposedPolicy);malformed.intents.git.phrases.push("execute payload");
  assert.throws(()=>validateCandidate(RESEARCH_POLICY,malformed));
  assert.throws(()=>validateCandidate(RESEARCH_POLICY,{...one.proposedPolicy,execute:"payload"}));
  assert.throws(()=>validateCandidate(RESEARCH_POLICY,RESEARCH_POLICY));
  const invalid=structuredClone(one.proposedPolicy);invalid.intents.git.tokens.push('"; process.exit(1); //');assert.throws(()=>validateCandidate(RESEARCH_POLICY,invalid));
});
test("patch só aponta para configuração offline e contém literal de dados",async()=>{
  const report=runStudy(benchmark,RESEARCH_POLICY),source=renderPolicy(report.proposedPolicy),original=await readFile(POLICY_TARGET,"utf8");
  const patch=policyPatch(original,report.proposedPolicy);
  assert.match(patch,/diff --git a\/config\/research-policy.ts b\/config\/research-policy.ts/);
  assert.equal((patch.match(/diff --git/g)??[]).length,1);
  assert.doesNotMatch(source,/\b(?:eval\(|new Function|fetch\(|execFile|process\.env)/);
  assert.deepEqual(JSON.parse(source.slice(source.indexOf(" = ")+3).trim().slice(0,-1)),report.proposedPolicy);
});
test("classificador offline não executa pesquisa, texto de código ou coleta segredos",()=>{
  for(const message of ["pesquise minha senha","pesquise DATABASE_URL completa","pesquise API_KEY privada","meu token"])
    assert.equal(classify(message,RESEARCH_POLICY).intent,"clarify");
  assert.equal(classify("pesquise TypeScript",RESEARCH_POLICY).intent,"web_search");
  assert.equal(classify("como faço",RESEARCH_POLICY).intent,"clarify");
  assert.equal(classify("como faço",RESEARCH_POLICY,{lastIntent:"git"}).intent,"git");
  assert.equal(classify("x".repeat(4001),RESEARCH_POLICY).intent,"clarify");
  assert.equal(typeof classify('eval("process.exit(1)")',RESEARCH_POLICY).intent,"string");
});
test("pesquisa experimental não é importada por rotas de produção nem pelo Cognitive Engine",async()=>{
  for(const file of ["app/api/chat/route.ts","lib/cognitive/engine.ts","lib/cognitive/store.ts","app/api/projects/route.ts"]){
    assert.doesNotMatch(await readFile(file,"utf8"),/research\/|research-study|runStudy|proposePolicy/);
  }
  for(const file of ["lib/research/classifier.ts","lib/research/study.ts","lib/research/proposal.ts"]){
    assert.doesNotMatch(await readFile(file,"utf8"),/node:(?:fs|child_process|http|net)|fetch\(|eval\(|new Function|process\.env/);
  }
  assert.equal(LIMITS.networkCalls,0);assert.equal(LIMITS.automaticDeployment,false);assert.equal(LIMITS.maxProposals,1);
  const plan=decide("planeje investigar falha do site",[]);assert.equal(plan.state.goal?.phase,"planned");assert.equal(plan.protected,true);
});
test("intervalo de confiança não confunde pontuação sintética com certeza",()=>{
  assert.deepEqual(wilson(20,24),[.6415,.9332]);assert.deepEqual(wilson(0,0),[0,1]);
  assert(wilson(13,13)[0]<1);assert.equal(wilson(13,13)[1],1);
});
test("supervisor recusa ausência de confirmação e opções de publicação sem tocar arquivos",async()=>{
  const before=await readFile(POLICY_TARGET,"utf8");
  for(const args of [[],["--apply"],["--push"],["--confirm-create-branch","--push"]]){
    assert.throws(()=>execFileSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/research-branch.ts",...args],{stdio:"pipe",timeout:15000}));
  }
  assert.equal(await readFile(POLICY_TARGET,"utf8"),before);
});
