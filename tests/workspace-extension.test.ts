import assert from "node:assert/strict";
import {test} from "node:test";
import {createRequire} from "node:module";
import {mkdtemp,mkdir,writeFile,symlink,rm,realpath} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,relative,isAbsolute} from "node:path";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {WRITABLE_SOURCE} from "../lib/source-policy";
const workspace=createRequire(import.meta.url)("../extensions/a3x-workspace/workspace.cjs") as {safeFile:(root:string,name:string)=>Promise<string>;read:(root:string,name:string)=>Promise<string>;rollback:(record:unknown)=>Promise<void>;apply:(root:string,task:unknown)=>Promise<{path:string}>;ALLOWED:string[]};
test("VS Code workspace blocks traversal, secret files, symlinks and preserves edits during rollback",async()=>{
 const root=await mkdtemp(join(tmpdir(),"a3x-extension-test-"));try{await mkdir(join(root,"lib"));await writeFile(join(root,"lib/example.ts"),"export const value=1;");assert.deepEqual(workspace.ALLOWED,WRITABLE_SOURCE);await assert.rejects(workspace.safeFile(root,"../private.ts"));await assert.rejects(workspace.safeFile(root,".env.local"));await assert.rejects(workspace.safeFile(root,"lib/.secret.ts"));assert.equal(await workspace.read(root,"lib/example.ts"),"export const value=1;");
 if(process.platform!=="win32"){await symlink(join(root,"lib/example.ts"),join(root,"lib/link.ts"));await assert.rejects(workspace.safeFile(root,"lib/link.ts"));}
 const record={path:root,file:"lib/example.ts",hash:createHash("sha256").update("export const value=1;").digest("hex"),original:"export const original=1;"};await writeFile(join(root,"lib/example.ts"),"user changed content");await assert.rejects(workspace.rollback(record),/editado/);await writeFile(join(root,"lib/example.ts"),"export const value=1;");await workspace.rollback(record);assert.equal(await workspace.read(root,"lib/example.ts"),record.original);
 }finally{const rel=relative(await realpath(tmpdir()),await realpath(root));if(!rel.startsWith("a3x-extension-test-")||rel.includes("..")||isAbsolute(rel))throw Error("Invalid cleanup");await rm(root,{recursive:true,force:true});}
});
test("VS Code applies a reviewed fixture to an isolated branch and restores it without executing code",async()=>{
 const root=await mkdtemp(join(tmpdir(),"a3x-extension-apply-")),file="components/mode-switch.tsx",original='export const title="Original";\n';const git=(...args:string[])=>execFileSync("git",args,{cwd:root,encoding:"utf8",windowsHide:true,stdio:["ignore","pipe","pipe"]}).trim();
 try{git("init");git("config","core.autocrlf","false");git("config","user.name","Fixture");git("config","user.email","fixture@example.test");git("remote","add","origin","https://github.com/luisgussamazon/baixardado.git");await mkdir(join(root,"components"));await writeFile(join(root,file),original);await writeFile(join(root,".gitignore"),".tools/\n");git("add",".");git("commit","-m","fixture");const head=git("rev-parse","HEAD"),sha=git("rev-parse","HEAD:"+file);const task={status:"review",pr_number:1,base_sha:head,proposal:{repository:"luisgussamazon/baixardado",files:[{path:file,sha}],edits:[{path:file,oldText:'"Original"',newText:'"Revisado"'}]}};const applied=await workspace.apply(root,task);assert.equal(await workspace.read(root,file),original);assert.match(await workspace.read(applied.path,file),/Revisado/);assert.equal(git("rev-parse","HEAD"),head);await workspace.rollback(applied);assert.equal(await workspace.read(applied.path,file),original);
 }finally{const rel=relative(await realpath(tmpdir()),await realpath(root));if(!rel.startsWith("a3x-extension-apply-")||rel.includes("..")||isAbsolute(rel))throw Error("Invalid cleanup");await rm(root,{recursive:true,force:true});}
});
