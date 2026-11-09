import {createHash,randomUUID} from "node:crypto";
import {existsSync,lstatSync,mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,realpathSync} from "node:fs";
import {resolve,relative,isAbsolute,join} from "node:path";
import {windowsProtect} from "./credential-store";
import type {LearningChunk} from "../lib/local-learning";
export type LearningBundle={version:1;kind:"inventory-documents";binding:string;sourceSha256:string;importedAt:string;documents:string[];chunks:LearningChunk[]};
export const learningBinding=(server:string,token:string)=>createHash("sha256").update("a3x-learning-v1\0"+server+"\0"+token).digest("hex");
export function validLearningBundle(value:unknown,binding:string):value is LearningBundle{
  if(!value||typeof value!=="object")return false;const b=value as LearningBundle;
  return b.version===1&&b.kind==="inventory-documents"&&b.binding===binding&&/^[a-f0-9]{64}$/.test(b.sourceSha256)&&typeof b.importedAt==="string"&&Number.isFinite(Date.parse(b.importedAt))&&Array.isArray(b.documents)&&b.documents.length<=65&&b.documents.every(name=>typeof name==="string"&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}\.md$/.test(name))&&Array.isArray(b.chunks)&&b.chunks.length<=512&&b.chunks.every(c=>c&&typeof c.id==="string"&&/^L\d+$/.test(c.id)&&typeof c.document==="string"&&b.documents.includes(c.document)&&typeof c.section==="string"&&c.section.length<=180&&typeof c.text==="string"&&c.text.length<=1600);
}
export function localLearningStore(server:string,token:string,root=process.cwd(),protect=windowsProtect){
  if(!/^[a-f0-9]{64}$/.test(token))throw new Error("Credencial inválida.");
  const binding=learningBinding(server,token),parent=resolve(root,".tools/local-learning");mkdirSync(parent,{recursive:true});
  const inside=relative(realpathSync(root),realpathSync(parent));if(inside.startsWith("..")||isAbsolute(inside))throw new Error("Diretório privado inválido.");
  const file=join(parent,binding+".dpapi");
  const check=()=>{if(existsSync(file)){const stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw new Error("Base privada inválida.");}};
  return {
    binding,
    load():LearningBundle|null{check();if(!existsSync(file))return null;const b:unknown=JSON.parse(protect("unprotect",readFileSync(file,"utf8")));if(!validLearningBundle(b,binding))throw new Error("Base não pertence à conexão atual.");return b;},
    save(bundle:LearningBundle){if(!validLearningBundle(bundle,binding))throw new Error("Base privada inválida.");check();const content=protect("protect",JSON.stringify(bundle));if(content.length>2_000_000||!/^[A-Za-z0-9+/=]+$/.test(content))throw new Error("Base acima do limite.");const tmp=file+"."+randomUUID()+".tmp";try{writeFileSync(tmp,content,{flag:"wx",mode:0o600});renameSync(tmp,file);}finally{if(existsSync(tmp))unlinkSync(tmp);}},
  };
}
