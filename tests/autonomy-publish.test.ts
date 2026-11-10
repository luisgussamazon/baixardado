import assert from "node:assert/strict";
import {test,mock} from "node:test";
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,relative,isAbsolute} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {publishAutonomy} from "../scripts/autonomy-publish.mjs";
test("publicação só aceita arquivos validados, não força main e confirma Railway",async()=>{
 const root=await mkdtemp(join(tmpdir(),"a3x-publish-test-")),id=randomUUID(),file="components/chat-app.tsx",content="export const title='revisto';",sha="a".repeat(40),commit="b".repeat(40),worktree=".tools/source-agent/review/test";let updates=0;
 try{await mkdir(join(root,".autonomy"));await mkdir(join(root,worktree,"components"),{recursive:true});await writeFile(join(root,worktree,file),content);const state={id,base:sha,worktree,files:[{path:file,hash:createHash("sha256").update(content).digest("hex")}]};await writeFile(join(root,".autonomy/validated.json"),JSON.stringify(state));
  mock.method(globalThis,"fetch",async()=>Response.json({ok:true}));
  const github={rest:{git:{getRef:async()=>({data:{object:{sha}}}),getCommit:async()=>({data:{tree:{sha:"tree"}}}),createBlob:async()=>({data:{sha:"blob"}}),createTree:async()=>({data:{sha:"tree2"}}),createCommit:async()=>({data:{sha:commit}}),createRef:async()=>({}),updateRef:async(args:{force:boolean;ref:string;sha:string})=>{updates++;assert.equal(args.force,false);assert.equal(args.ref,"heads/main");assert.equal(args.sha,commit);}},repos:{listDeployments:async()=>({data:[{id:1,environment:"considerate-caring / production"}]}),listDeploymentStatuses:async()=>({data:[{state:"success"}]})}}};
  const options={github,core:{getIDToken:async()=>"FAKE-OIDC"},context:{repo:{owner:"luisgussamazon",repo:"baixardado"},sha},root};await publishAutonomy(options);assert.equal(updates,1);assert.equal(JSON.parse(await readFile(join(root,".autonomy/outcome.json"),"utf8")).status,"deployed");
  github.rest.git.getRef=async()=>({data:{object:{sha:"c".repeat(40)}}});await assert.rejects(publishAutonomy(options),/Main mudou/);assert.equal(updates,1);
  state.files[0].path="lib/security.ts";await writeFile(join(root,".autonomy/validated.json"),JSON.stringify(state));await assert.rejects(publishAutonomy(options),/Escopo/);assert.equal(updates,1);
 }finally{mock.restoreAll();const rel=relative(await realpath(tmpdir()),await realpath(root));if(!rel.startsWith("a3x-publish-test-")||rel.includes("..")||isAbsolute(rel))throw Error("Limpeza inválida.");await rm(root,{recursive:true,force:true});}
});
