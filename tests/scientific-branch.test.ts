import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync,readFileSync,writeFileSync,existsSync,rmSync } from "node:fs";
import { resolve,join,relative,isAbsolute } from "node:path";
import { createHash,randomUUID } from "node:crypto";
import { RESEARCH_POLICY } from "../config/research-policy";
import { runStudy } from "../lib/research/study";
import { POLICY_TARGET,renderPolicy } from "../lib/research/proposal";
import dataset from "../research/autonomia-v1/benchmark.json";
test("supervisor prepara somente configuração em outra branch, sem commit ou publicação",()=>{
  const workspace=resolve(".tools"),fixture=join(workspace,"scientific-fixture-"+randomUUID());
  const rel=relative(workspace,fixture);assert(!rel.startsWith("..")&&!isAbsolute(rel));
  mkdirSync(join(fixture,"config"),{recursive:true});
  const testHooks=join(fixture,".tools/empty-hooks");mkdirSync(testHooks,{recursive:true});
  const git=(...args:string[])=>execFileSync("git",["-c","core.hooksPath="+testHooks,"-c","core.fsmonitor=false","-c","commit.gpgsign=false",...args],{cwd:fixture,encoding:"utf8",stdio:"pipe",timeout:15000}).trim();
  const baseline=readFileSync(POLICY_TARGET,"utf8").replace(/\r\n/g,"\n");
  const candidate=runStudy(dataset,RESEARCH_POLICY).proposedPolicy,candidateRaw=JSON.stringify(candidate,null,2)+"\n";
  const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
  const worktree=join(fixture,".tools/research-review",hash(candidateRaw).slice(0,12));
  try{
    writeFileSync(join(fixture,POLICY_TARGET),baseline);writeFileSync(join(fixture,".gitignore"),".tools/\n");
    git("init","-b","feature/fixture");git("config","user.name","A3X local test");git("config","user.email","fixture@example.invalid");
    git("remote","add","origin","https://github.com/luisgussamazon/baixardado.git");git("add",".gitignore",POLICY_TARGET);git("commit","-m","baseline local de teste");
    const originalHead=git("rev-parse","HEAD"),output=join(fixture,".tools/research-results");mkdirSync(output,{recursive:true});
    writeFileSync(join(output,"proposal-policy.json"),candidateRaw);writeFileSync(join(output,"manifest.json"),JSON.stringify({target:POLICY_TARGET,baselineSha256:hash(baseline),candidateSha256:hash(candidateRaw)}));
    const raw=execFileSync(process.execPath,[resolve("node_modules/tsx/dist/cli.mjs"),"--tsconfig",resolve("tsconfig.json"),resolve("scripts/research-branch.ts"),"--confirm-create-branch"],{cwd:fixture,encoding:"utf8",stdio:"pipe",timeout:20000});
    const result=JSON.parse(raw);assert.match(result.branch,/^proposal\/a3x-research-[a-f0-9]{12}$/);
    assert.equal(result.committed,false);assert.equal(result.pushed,false);assert.equal(result.deployed,false);
    assert.equal(git("branch","--show-current"),"feature/fixture");assert.equal(git("rev-parse","HEAD"),originalHead);
    assert.equal(readFileSync(join(fixture,POLICY_TARGET),"utf8").replace(/\r\n/g,"\n"),baseline);
    assert.equal(readFileSync(join(worktree,POLICY_TARGET),"utf8"),renderPolicy(candidate));
    assert.equal(git("-C",worktree,"diff","--name-only"),POLICY_TARGET);assert.equal(git("rev-list","--all","--count"),"1");
    assert.equal(git("status","--porcelain"),"");
    assert.throws(()=>execFileSync(process.execPath,[resolve("node_modules/tsx/dist/cli.mjs"),"--tsconfig",resolve("tsconfig.json"),resolve("scripts/research-branch.ts"),"--confirm-create-branch"],{cwd:fixture,stdio:"pipe",timeout:20000}));
  }finally{
    if(existsSync(join(worktree,".git")))git("worktree","remove","--force",worktree);
    // Destino absoluto verificado acima e exclusivo deste teste, dentro de .tools.
    if(existsSync(fixture))rmSync(fixture,{recursive:true,force:true});
  }
});
