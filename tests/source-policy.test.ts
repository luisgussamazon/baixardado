import assert from "node:assert/strict";
import {test} from "node:test";
import {validateSourceEdits,applySourceEdits,safeSourcePath} from "../lib/source-policy";
const file={path:"components/chat-app.tsx",sha:"a".repeat(40),content:'export const title = "Original";\n'};
const candidate={summary:"Melhorar título",edits:[{path:file.path,oldText:'"Original"',newText:'"Revisado"'}]};
test("substituições exatas preservam código não relacionado e validam hashes",()=>{
 const proposal=validateSourceEdits(candidate,[file]);assert.equal(applySourceEdits(proposal,[file])[0].content,'export const title = "Revisado";\n');
 assert.throws(()=>applySourceEdits(proposal,[{...file,sha:"b".repeat(40)}]),/mudou/);
 assert.throws(()=>validateSourceEdits(candidate,[{...file,content:file.content+file.content}]),/única/);
 assert.throws(()=>validateSourceEdits({...candidate,edits:[{...candidate.edits[0],oldText:"inexistente"}]},[file]),/original/);
});
test("bloqueia traversal, arquivos protegidos, rede, execução e excesso",()=>{
 for(const path of ["../.env",".env.local","lib/../security.ts","C:/secret.ts","app/api/login/route.ts"]){if(path.includes("..")||path.startsWith(".")||path.includes(":"))assert.equal(safeSourcePath(path),false);assert.throws(()=>validateSourceEdits({...candidate,edits:[{...candidate.edits[0],path}]},[file]));}
 for(const newText of ['fetch("/api/delete")','process.env.SECRET','eval("1")','document.cookie','https://evil.test/',"x".repeat(6001)])assert.throws(()=>validateSourceEdits({...candidate,edits:[{...candidate.edits[0],newText}]},[file]));
 assert.throws(()=>validateSourceEdits({...candidate,edits:Array(9).fill(candidate.edits[0])},[file]));assert.throws(()=>applySourceEdits({...validateSourceEdits(candidate,[file]),repository:"other/repo" as never},[file]));
});
