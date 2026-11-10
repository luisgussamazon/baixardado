import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {sandboxArgs} from "../scripts/autonomy-sandbox.mjs";
import {AUTONOMY_ALLOWED} from "../scripts/autonomy-publish.mjs";
import {WRITABLE_SOURCE} from "../lib/source-policy";
test("sandbox protege fontes e dependências, elimina rede, credenciais e privilégios",async()=>{
 const args=sandboxArgs("/snapshot","/modules","/artifacts",1001,1001,"npm test");const joined=args.join(" ");assert.match(joined,/--network none/);assert.match(joined,/--read-only/);assert.match(joined,/--cap-drop=ALL/);assert.match(joined,/no-new-privileges/);assert.match(joined,/source=\/snapshot,target=\/workspace,readonly/);assert.match(joined,/target=\/workspace\/node_modules,readonly/);assert.doesNotMatch(joined,/OPENAI_API_KEY|GITHUB_TOKEN|\.git[, ]|docker\.sock|--privileged|network host/);
 assert.deepEqual(AUTONOMY_ALLOWED,WRITABLE_SOURCE);
 const workflow=await readFile(".github/workflows/a3x-autonomy.yml","utf8");assert.match(workflow,/persist-credentials: false/);assert.match(workflow,/id-token: write/);assert.doesNotMatch(workflow,/pull_request_target|secrets\.OPENAI|force: true/);
 const source=await readFile("scripts/autonomy-sandbox.mjs","utf8");assert.match(source,/npm run typecheck -- --incremental false/);assert.match(source,/npm run build/);assert.match(source,/artifacts-.*index/);
});
test("ambiente isolado não herda tokens, banco ou arquivos de ambiente",async()=>{
 if(process.env.A3X_SANDBOX!=="1")return;
 for(const name of ["OPENAI_API_KEY","DATABASE_URL","GITHUB_TOKEN","ACTIONS_ID_TOKEN_REQUEST_TOKEN"])assert.equal(process.env[name],undefined);
 const fs=await import("node:fs/promises");await assert.rejects(fs.access(".git"));await assert.rejects(fs.access(".env.local"));await assert.rejects(fs.writeFile("package.json","tamper"));
});
