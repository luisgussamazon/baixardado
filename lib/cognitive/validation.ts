import type { MemoryKind } from "./types";
const kinds:MemoryKind[]=["fact","preference","correction","feedback"];
export function validateRecord(body:Record<string,unknown>|null){
  if(!body||Object.keys(body).some(k=>!["kind","label","value","question"].includes(k)))return null;
  const {kind,label,value}=body;
  if(typeof kind!=="string"||!kinds.includes(kind as MemoryKind))return null;
  if(typeof label!=="string"||!label.trim()||label.length>100||/[\x00-\x1f]/.test(label))return null;
  if(typeof value!=="string"||!value.trim()||value.length>4000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))return null;
  const question=body.question==null||body.question===""?null:body.question;
  if(question!==null&&(typeof question!=="string"||!question.trim()||question.length>500||/[\x00-\x1f]/.test(question)))return null;
  if(kind==="correction"&&!question)return null;
  // Reduz persistência acidental de credenciais; não substitui revisão do usuário.
  if(/(?:sk-[a-z0-9_-]{15,}|postgres(?:ql)?:\/\/|-----BEGIN .*PRIVATE KEY|\b(?:senha|password|api_key|token)\s*[:=])/i.test(label+" "+value))return null;
  return {kind:kind as MemoryKind,label:label.trim(),value:value.trim(),question:typeof question==="string"?question.trim():null};
}
