import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {safeSourcePath,WRITABLE_SOURCE,SOURCE_REPOSITORY,type SourceFile} from "./source-policy";
let cached:Promise<SourceFile[]>|undefined;
export async function sourceFiles(){
 if(!cached)cached=(async()=>{const raw=await readFile(join(process.cwd(),".generated/a3x-source.json"));if(raw.length>2_500_000)throw Error("Catálogo excessivo.");const value=JSON.parse(raw.toString("utf8"));if(value.repository!==SOURCE_REPOSITORY||!Array.isArray(value.files)||value.files.length>500)throw Error("Catálogo inválido.");return value.files.filter((f:SourceFile)=>safeSourcePath(f.path)&&/^[a-f0-9]{40}$/.test(f.sha)&&typeof f.content==="string"&&f.content.length<=60000) as SourceFile[];})();
 try{return await cached;}catch(error){cached=undefined;throw error;}
}
export async function selectedSourceFiles(paths:unknown,writable=false){if(!Array.isArray(paths)||!paths.length||paths.length>3||new Set(paths).size!==paths.length||!paths.every(safeSourcePath))throw Error("Selecione de um a três arquivos do catálogo.");const catalog=await sourceFiles();const files=paths.map(path=>catalog.find(f=>f.path===path));if(files.some(f=>!f||(writable&&!WRITABLE_SOURCE.includes(f.path))))throw Error("Arquivo não disponível neste escopo.");if(files.reduce((n,f)=>n+f!.content.length,0)>32000||JSON.stringify(files).length>35000)throw Error("Selecione menos arquivos: limite de contexto por solicitação.");return files as SourceFile[];}
