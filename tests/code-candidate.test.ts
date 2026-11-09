import {test} from "node:test";
import assert from "node:assert/strict";
import {validateCodeCandidate} from "../lib/code-candidate";
const candidate=(path:string,content="export function soma(a:number,b:number){return a+b;}")=>({files:[{path,content}]});
test("agente aceita função pura sem executar seu conteúdo",()=>assert.equal(validateCodeCandidate(candidate("lib/experiments/soma.ts")).length,1));
test("agente rejeita traversal, alterações no aplicativo, efeitos externos e excesso",()=>{
  for(const path of ["../x.ts","app/page.tsx","lib/experiments/../db.ts","lib/experiments/CON.ts","lib/experiments/con.ts","lib/experiments/x.ts:foo","lib\\experiments\\x.ts"])assert.throws(()=>validateCodeCandidate(candidate(path)));
  for(const code of ['import fs from "node:fs";','export const x=process.env;','eval("x")','export const x=fetch("http://x");','export const = ;',"x".repeat(16001)])assert.throws(()=>validateCodeCandidate(candidate("lib/experiments/x.ts",code)));
  assert.throws(()=>validateCodeCandidate({files:[]}));
  assert.throws(()=>validateCodeCandidate({files:[...candidate("lib/experiments/x.ts").files,...candidate("lib/experiments/x.ts").files]}));
});
