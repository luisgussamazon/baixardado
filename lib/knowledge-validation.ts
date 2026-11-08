import { safeKnowledgeUrl } from "./knowledge-data.mjs";
export type KnowledgeInput={topic:string;title:string;question:string;answer:string;keywords:string[];source_url:string|null};
function limited(value:unknown,max:number,multiline=false):string|null {
  const banned=multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/ : /[\u0000-\u001f]/;
  return typeof value==="string" && !!value.trim() && value.trim().length<=max &&
    !banned.test(value) ? value.trim() : null;
}
export function validateKnowledge(body:Record<string,unknown>|null):KnowledgeInput|null {
  if(!body || Array.isArray(body) || Object.keys(body).some(key=>!["topic","title","question","answer","keywords","source_url"].includes(key)))return null;
  const topic=limited(body.topic,80),title=limited(body.title,180),
    question=limited(body.question,500),answer=limited(body.answer,4000,true);
  if(!topic||!title||!question||!answer)return null;
  const keys=body.keywords;
  if(!Array.isArray(keys)||keys.length>10 || !keys.every(x=>typeof x==="string"&&x.length<=60 && !/[\u0000-\u001f]/.test(x)))return null;
  const keywords=[...new Set(keys.map(x=>(x as string).trim()).filter(Boolean))];
  let source_url:string|null=null;
  if(body.source_url!=null && body.source_url!==""){
    if(typeof body.source_url!=="string"||body.source_url.length>2000)return null;
    try{
      source_url=safeKnowledgeUrl(body.source_url);
    }catch{return null;}
  }
  return {topic,title,question,answer,keywords,source_url};
}
