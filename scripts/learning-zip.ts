import {Unzip,UnzipInflate} from "fflate";
import type {LearningDocument} from "../lib/local-learning";
export function readLearningZip(bytes:Uint8Array):LearningDocument[]{
  if(!bytes.length||bytes.length>2_000_000||bytes[0]!==80||bytes[1]!==75)throw new Error("ZIP inválido ou acima de 2 MB.");
  const documents:LearningDocument[]=[],names=new Set<string>();let total=0,finished=0;
  const zip=new Unzip(file=>{
    if(names.size>=64||! /^[A-Za-z0-9][A-Za-z0-9._-]{0,100}\.md$/.test(file.name)||file.name.includes("..")||/^(con|prn|aux|nul|com\d|lpt\d)\./i.test(file.name)||names.has(file.name.toLowerCase())||file.originalSize!==undefined&&file.originalSize>128000)throw new Error("Arquivo fora do escopo Markdown ou limite excedido.");
    names.add(file.name.toLowerCase());let length=0;const parts:Uint8Array[]=[];
    file.ondata=(error,data,final)=>{
      if(error)throw new Error("ZIP corrompido.");length+=data.length;total+=data.length;
      if(length>128000||total>2_000_000){file.terminate();throw new Error("ZIP descompactado acima do limite.");}
      parts.push(data);if(final){const raw=Buffer.concat(parts);documents.push({name:file.name,text:new TextDecoder("utf-8",{fatal:true}).decode(raw)});finished++;}
    };file.start();
  });zip.register(UnzipInflate);
  for(let offset=0;offset<bytes.length;offset+=256)zip.push(bytes.subarray(offset,offset+256),offset+256>=bytes.length);
  if(!documents.length||finished!==names.size)throw new Error("ZIP incompleto ou vazio.");return documents;
}
