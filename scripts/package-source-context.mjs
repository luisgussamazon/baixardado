import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const paths=JSON.parse(await fs.readFile('source-catalog.json','utf8'));
if(!Array.isArray(paths)||paths.length>500)throw Error('Manifesto inválido.');
const files=[];let total=0;
for(const path of paths){
 if(typeof path!=='string'||! /^(?:(?:app|components|lib|scripts|docs)\/[a-zA-Z0-9_./()[\]-]+\.(?:ts|tsx|css|md|mjs)|README\.md|AGENTS\.md)$/.test(path)||path.includes('..')||path.split('/').some(p=>p.startsWith('.')))throw Error('Caminho inválido no manifesto.');
 let parent='';for(const part of path.split('/')){parent+=(parent?'/':'')+part;if((await fs.lstat(parent)).isSymbolicLink())throw Error('Links não são permitidos.');}
 const stat=await fs.lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>60000)continue;
 const input=await fs.readFile(path);const content=new TextDecoder('utf8',{fatal:true}).decode(input).replace(/\r\n/g,'\n');const raw=Buffer.from(content);
 // Nunca empacotar valores com formato de credencial; nomes de variáveis de ambiente são código público.
 if(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i.test(content))continue;
 if((total+=raw.length)>2_000_000)throw Error('Catálogo excedeu o limite.');
 const sha=createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');files.push({path,sha,content});
}
await fs.mkdir('.generated',{recursive:true});await fs.writeFile('.generated/a3x-source.json',JSON.stringify({repository:'luisgussamazon/baixardado',files}));
console.log('Catálogo público de código: '+files.length+' arquivos, sem arquivos de ambiente.');
