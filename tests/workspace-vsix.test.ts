import {test,mock} from "node:test";
import {AsyncLocalStorage} from "node:async_hooks";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {unzipSync,strFromU8} from "fflate";

test("VSIX contains only the fixed public extension and installation manifests",()=>{
 execFileSync(process.execPath,["scripts/package-workspace-extension.mjs"]);
 const entries=unzipSync(readFileSync(".generated/a3x-workspace.vsix"));
 assert.deepEqual(Object.keys(entries).sort(),["[Content_Types].xml","extension.vsixmanifest","extension/README.md","extension/extension.cjs","extension/package.json","extension/workspace.cjs"].sort());
 const manifest=JSON.parse(strFromU8(entries["extension/package.json"]));
 assert.equal(manifest.main,"./extension.cjs");assert.equal(manifest.publisher,"a3x-tech");
 assert.ok(manifest.contributes.commands.some((c:{command:string})=>c.command==="a3x.connect"));
 assert.match(strFromU8(entries["extension.vsixmanifest"]),/Microsoft.VisualStudio.Code.Manifest/);
 assert.equal(strFromU8(entries["extension/extension.cjs"]),readFileSync("extensions/a3x-workspace/extension.cjs","utf8"));
});

test("VSIX download requires a session and returns only the generated package",async()=>{
 Object.assign(globalThis,{AsyncLocalStorage});
 const {GET}=await import("../app/a3x-workspace.vsix/route");
 const {db}=await import("../lib/db");
 const {workUnitAsyncStorage:storage}=await import("next/dist/server/app-render/work-unit-async-storage.external");
 const {workAsyncStorage:work}=await import("next/dist/server/app-render/work-async-storage.external");
 const {ResponseCookies:Cookies}=await import("next/dist/server/web/spec-extension/cookies");
 const request=(authorized:boolean)=>{const cookies=new Cookies(new Headers());if(authorized)cookies.set("a3x_session","fixture-session");return work.run({route:"/a3x-workspace.vsix"} as never,()=>storage.run({type:"request",phase:"action",cookies,userspaceMutableCookies:cookies} as never,GET));};
 try{
  mock.method(db,"query",async()=>({rows:[{id:"fixture-user",email:"fixture@example.test"}],rowCount:1}));
  assert.equal((await request(false)).status,401);
  const response=await request(true);assert.equal(response.status,200);
  assert.equal(response.headers.get("Cache-Control"),"private, no-store");
  assert.match(response.headers.get("Content-Disposition")??"",/attachment/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(".generated/a3x-workspace.vsix"));
 }finally{mock.restoreAll();}
});
