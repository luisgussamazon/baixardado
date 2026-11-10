import assert from "node:assert/strict";
import {test} from "node:test";
import {validateAutonomousChanges} from "../scripts/autonomy-safety";
import {validateSourceEdits} from "../lib/source-policy";
test("autonomia preserva estrutura e consentimento do Chat e aceita melhoria de texto",()=>{
 const file={path:"components/chat-app.tsx",sha:"a".repeat(40),content:'export function Chat(){const confirmed=true;return <h1>Texto original</h1>}'};
 const change=(oldText:string,newText:string)=>validateSourceEdits({summary:"Revisão",edits:[{path:file.path,oldText,newText}]},[file]);
 assert.match(validateAutonomousChanges(change("Texto original","Texto mais claro"),[file])[0].content,/Texto mais claro/);
 assert.throws(()=>validateAutonomousChanges(change("confirmed=true","confirmed=false"),[file]),/imutáveis/);
});
test("autonomia recusa novos efeitos externos e CSS com carregamento",()=>{
 const file={path:"lib/knowledge-terms.ts",sha:"a".repeat(40),content:'export function value(){return "original";}'};
 const proposal=validateSourceEdits({summary:"Revisão",edits:[{path:file.path,oldText:'return "original";',newText:'return globalThis.value;'}]},[file]);assert.throws(()=>validateAutonomousChanges(proposal,[file]),/Efeito externo/);
 const css={path:"app/workspace-theme.css",sha:"b".repeat(40),content:".card{color:white}"};const c=validateSourceEdits({summary:"Revisão",edits:[{path:css.path,oldText:"color:white",newText:"background:url(/capture)"}]},[css]);assert.throws(()=>validateAutonomousChanges(c,[css]),/CSS/);
});
