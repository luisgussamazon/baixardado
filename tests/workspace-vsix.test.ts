import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {unzipSync,strFromU8} from "fflate";

test("VSIX contains only the fixed public extension and installation manifests",()=>{
 execFileSync(process.execPath,["scripts/package-workspace-extension.mjs"]);
 const entries=unzipSync(readFileSync("public/a3x-workspace.vsix"));
 assert.deepEqual(Object.keys(entries).sort(),["[Content_Types].xml","extension.vsixmanifest","extension/README.md","extension/extension.cjs","extension/package.json","extension/workspace.cjs"].sort());
 const manifest=JSON.parse(strFromU8(entries["extension/package.json"]));
 assert.equal(manifest.main,"./extension.cjs");assert.equal(manifest.publisher,"a3x-tech");
 assert.ok(manifest.contributes.commands.some((c:{command:string})=>c.command==="a3x.connect"));
 assert.match(strFromU8(entries["extension.vsixmanifest"]),/Microsoft.VisualStudio.Code.Manifest/);
 assert.equal(strFromU8(entries["extension/extension.cjs"]),readFileSync("extensions/a3x-workspace/extension.cjs","utf8"));
});
