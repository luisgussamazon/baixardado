import assert from "node:assert/strict";
import {test} from "node:test";
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,relative,isAbsolute} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {publishEngineering} from "../scripts/engineering-publish.mjs";
test("engineering publishes only a review branch/PR with verified content, never main or private goal",async()=>{
 const root=await mkdtemp(join(tmpdir(),"a3x-engineering-publish-")),id=randomUUID(),file="components/mode-switch.tsx",text="export const value='review';",sha="a".repeat(40),worktree=".tools/source-agent/review/test";let refs=0,auth=0;
 try{await mkdir(join(root,".autonomy"));await mkdir(join(root,worktree,"components"),{recursive:true});await writeFile(join(root,worktree,file),text);const state={id,base:sha,worktree,checked:true,files:[{path:file,hash:createHash("sha256").update(text).digest("hex")}]};await writeFile(join(root,".autonomy/validated.json"),JSON.stringify(state));
 const github={rest:{git:{getRef:async()=>({data:{object:{sha}}}),getCommit:async()=>({data:{tree:{sha:"base"}}}),createBlob:async()=>({data:{sha:"blob"}}),createTree:async()=>({data:{sha:"tree"}}),createCommit:async()=>({data:{sha:"b".repeat(40)}}),createRef:async(value:{ref:string})=>{assert.match(value.ref,/^refs\/heads\/agent\/engineering-/);refs++;},updateRef:async()=>{throw Error("Main write forbidden");}},pulls:{create:async(value:{head:string;base:string;body:string})=>{assert.equal(value.base,"main");assert.match(value.head,/agent\/engineering-/);assert.doesNotMatch(value.body,/goal|hypothesis|private/i);return {data:{number:12}};}}}};
 const opts={github,context:{repo:{owner:"luisgussamazon",repo:"baixardado"},sha},root,authorize:async()=>{auth++;}};assert.equal((await publishEngineering(opts)).pr,12);assert.equal(refs,1);assert.equal(auth,2);
 await writeFile(join(root,worktree,file),"tampered");await assert.rejects(publishEngineering(opts),/Hash/);assert.equal(refs,1);state.checked=false;await writeFile(join(root,".autonomy/validated.json"),JSON.stringify(state));await assert.rejects(publishEngineering(opts),/scope/);
 }finally{const rel=relative(await realpath(tmpdir()),await realpath(root));if(!rel.startsWith("a3x-engineering-publish-")||rel.includes("..")||isAbsolute(rel))throw Error("Unsafe cleanup");await rm(root,{recursive:true,force:true});}
});
