export const SOURCE_REPOSITORY="luisgussamazon/baixardado";
export const WRITABLE_SOURCE=["components/chat-app.tsx","components/assistant-answer.tsx","components/mode-switch.tsx","app/a3x-theme.css","app/workspace-theme.css","app/globals.css","lib/a3x-personality.ts"];
export function safeSourcePath(path:unknown):path is string{return typeof path==="string"&&path.length<=180&&/^(?:app|components|lib|scripts|docs)\/[a-zA-Z0-9_./()[\]-]+\.(?:ts|tsx|css|md|mjs)$/.test(path)&&!path.includes("..")&&!path.split("/").some(p=>p.startsWith("."))||path==="README.md"||path==="AGENTS.md";}
export type SourceFile={path:string;sha:string;content:string};
export type SourceEdit={path:string;oldText:string;newText:string};
export type SourceProposal={version:1;repository:typeof SOURCE_REPOSITORY;summary:string;files:{path:string;sha:string}[];edits:SourceEdit[]};
export function validateSourceEdits(value:unknown,files:SourceFile[]):SourceProposal{
 const v=value as {summary?:unknown;edits?:unknown[]};
 if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).some(k=>!["summary","edits"].includes(k))||typeof v.summary!=="string"||!v.summary.trim()||v.summary.length>1000||!Array.isArray(v.edits)||v.edits.length<1||v.edits.length>8)throw Error("Proposta inválida. Use resumo e até oito substituições exatas.");
 let total=0;const working=new Map(files.map(f=>[f.path,f.content]));const edits:SourceEdit[]=[];
 for(const item of v.edits){
  if(!item||typeof item!=="object"||Array.isArray(item)||Object.keys(item).some(k=>!["path","oldText","newText"].includes(k)))throw Error("Alteração inválida.");
  const e=item as SourceEdit;
  if(!WRITABLE_SOURCE.includes(e.path)||!working.has(e.path)||typeof e.oldText!=="string"||e.oldText.length<8||e.oldText.length>4000||typeof e.newText!=="string"||e.newText.length>6000||e.newText===e.oldText||/[\u0000]/.test(e.newText)||(total+=e.oldText.length+e.newText.length)>18000)throw Error("Alteração fora dos caminhos ou limites permitidos.");
  if(/\b(?:eval|Function|require)\s*\(|process\s*\.|child_process|node:fs|dangerouslySetInnerHTML|document\s*\.\s*cookie|localStorage|\bfetch\s*\(|https?:\/\//i.test(e.newText))throw Error("A proposta acrescenta código ou acesso externo não permitido nesta versão.");
  const content=working.get(e.path)!;const start=content.indexOf(e.oldText);if(start<0||content.indexOf(e.oldText,start+1)>=0)throw Error("O trecho original deve existir uma única vez no arquivo selecionado.");
  const next=content.slice(0,start)+e.newText+content.slice(start+e.oldText.length);if(!next.trim()||Buffer.byteLength(next)>60000)throw Error("Arquivo final inválido.");working.set(e.path,next);edits.push({path:e.path,oldText:e.oldText,newText:e.newText});
 }
 return {version:1,repository:SOURCE_REPOSITORY,summary:v.summary.trim(),files:files.filter(f=>edits.some(e=>e.path===f.path)).map(({path,sha})=>({path,sha})),edits};
}
export function applySourceEdits(proposal:SourceProposal,files:SourceFile[]){
 if(!proposal||proposal.version!==1||proposal.repository!==SOURCE_REPOSITORY||!Array.isArray(proposal.files)||proposal.files.length<1||proposal.files.length>3)throw Error("Repositório ou versão inválida.");
 if(new Set(proposal.files.map(f=>f.path)).size!==proposal.files.length)throw Error("Arquivos repetidos.");
 for(const f of proposal.files){if(!files.some(current=>current.path===f.path&&current.sha===f.sha))throw Error("Arquivo mudou desde a proposta. Gere outra proposta.");}
 const validated=validateSourceEdits({summary:proposal.summary,edits:proposal.edits},files);
 if(validated.files.length!==proposal.files.length||validated.files.some(f=>!proposal.files.some(p=>p.path===f.path&&p.sha===f.sha)))throw Error("Manifesto da proposta divergente.");
 return validated.files.map(f=>{let content=files.find(item=>item.path===f.path)!.content;for(const e of validated.edits.filter(e=>e.path===f.path)){const at=content.indexOf(e.oldText);content=content.slice(0,at)+e.newText+content.slice(at+e.oldText.length);}return {path:f.path,content};});
}
