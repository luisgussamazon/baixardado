import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,relative,isAbsolute} from "node:path";
import {execFileSync} from "node:child_process";
import {applyLocalSourceProposal} from "../scripts/source-worktree";
import {validateSourceEdits} from "../lib/source-policy";
test("aplica em branch isolada, preserva checkout e nunca executa ou publica código",()=>{
 const root=mkdtempSync(join(tmpdir(),"a3x-source-test-"));const git=(...args:string[])=>execFileSync("git",args,{cwd:root,windowsHide:true,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 try{
  git("init");git("config","user.name","Teste local");git("config","user.email","local@example.test");git("remote","add","origin","https://github.com/luisgussamazon/baixardado.git");mkdirSync(join(root,"components"));writeFileSync(join(root,".gitignore"),".tools/\n");const path="components/chat-app.tsx",content='export const title = "Original";\n';writeFileSync(join(root,path),content);git("add",".");git("commit","-m","fixture");const head=git("rev-parse","HEAD"),branch=git("branch","--show-current"),sha=git("rev-parse","HEAD:"+path);
  const proposal=validateSourceEdits({summary:"Título",edits:[{path,oldText:'"Original"',newText:'"Revisado"'}]},[{path,sha,content}]);
  const result=applyLocalSourceProposal(root,proposal);assert.match(result.branch,/^agent\/a3x-/);assert.equal(result.executed,false);assert.equal(result.published,false);assert.equal(git("rev-parse","HEAD"),head);assert.equal(git("branch","--show-current"),branch);assert.equal(readFileSync(join(root,path),"utf8"),content);assert.match(readFileSync(join(root,result.worktree,path),"utf8"),/Revisado/);assert.equal(git("status","--porcelain"),"");
  assert.throws(()=>applyLocalSourceProposal(root,{...proposal,files:[{path,sha:"f".repeat(40)}]}),/mudou/);
  writeFileSync(join(root,path),"checkout alterado");assert.throws(()=>applyLocalSourceProposal(root,proposal),/checkout/);
 }finally{const resolved=realpathSync(root),rel=relative(realpathSync(tmpdir()),resolved);if(!rel.startsWith("a3x-source-test-")||rel.includes("..")||isAbsolute(rel))throw Error("Limpeza fora da pasta descartável.");rmSync(resolved,{recursive:true,force:true});}
});
