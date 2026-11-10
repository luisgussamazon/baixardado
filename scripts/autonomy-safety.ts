import ts from "typescript";
import {applySourceEdits,type SourceFile,type SourceProposal} from "../lib/source-policy";
const COPY_ONLY=new Set(["components/chat-app.tsx","components/mode-switch.tsx"]);
function shape(source:ts.SourceFile){
 function nodeShape(node:ts.Node):unknown{
  if(ts.isJsxText(node))return [node.kind,"copy"];
  if(ts.isStringLiteral(node)&&((ts.isJsxAttribute(node.parent)&&/^(title|placeholder|aria-label)$/.test(node.parent.name.getText(source)))||(ts.isPropertyAssignment(node.parent)&&/^(title|text|description)$/.test(node.parent.name.getText(source)))))return [node.kind,"copy"];
  const children:unknown[]=[];ts.forEachChild(node,n=>{children.push(nodeShape(n));});return children.length?[node.kind,children]:[node.kind,node.getText(source)];
 }
 return JSON.stringify(nodeShape(source));
}
export function validateAutonomousChanges(proposal:SourceProposal,files:SourceFile[]){
 const changes=applySourceEdits(proposal,files);
 for(const file of changes){
  if(file.path.endsWith(".css")){for(const edit of proposal.edits.filter(e=>e.path===file.path))if(/url\s*\(|@import|@font-face|expression\s*\(|behavior\s*:|-moz-binding|\\/.test(edit.newText))throw Error("CSS autônomo não pode acrescentar carregamento externo.");continue;}
  const parse=(content:string)=>ts.createSourceFile(file.path,content,ts.ScriptTarget.ES2022,true,file.path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS),before=parse(files.find(f=>f.path===file.path)!.content),after=parse(file.content);
  if(COPY_ONLY.has(file.path)){if(shape(before)!==shape(after))throw Error("Fluxos de consentimento, chamadas e lógica da interface são imutáveis na autonomia.");continue;}
  const imports=(source:ts.SourceFile)=>source.statements.filter(ts.isImportDeclaration).map(n=>n.getText(source));if(JSON.stringify(imports(before))!==JSON.stringify(imports(after)))throw Error("Novas importações exigem revisão do mantenedor.");
  const visit=(node:ts.Node)=>{if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)throw Error("Importação dinâmica proibida.");if(ts.isIdentifier(node)&&/^(eval|Function|require|process|global|globalThis|window|document|navigator|fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|Buffer|Deno|Bun|Reflect|constructor|__proto__|prototype)$/.test(node.text))throw Error("Efeito externo proibido no código autônomo.");ts.forEachChild(node,visit);};visit(after);
 }
 return changes;
}
