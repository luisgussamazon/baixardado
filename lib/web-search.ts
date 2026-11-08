import { XMLParser } from "fast-xml-parser";
import { decodeHTML } from "entities";
import { isIP } from "node:net";

export type WebResult = {title:string;url:string;snippet:string};
export type WebResearch = {source:"Bing"|"Wikipedia";results:WebResult[]};
export function publicSourceUrl(value:unknown):string|null {
  if(typeof value!=="string"||value.length>2000)return null;
  try {
    const url=new URL(value);
    const host=url.hostname.toLowerCase().replace(/\.$/,"");
    if(!["http:","https:"].includes(url.protocol)||url.username||url.password||
      isIP(host.replace(/^\[|\]$/g,""))||!host.includes(".")||/\.(local|internal|localhost|test|invalid)$/.test(host)||host==="localhost")return null;
    return url.href.replace(/\(/g,"%28").replace(/\)/g,"%29");
  }catch{return null;}
}
const text=(value:unknown,max:number)=>typeof value==="string"?decodeHTML(value.replace(/<[^>]*>/g," ")).replace(/\s+/g," ").trim().slice(0,max):"";
export function parseSearchRss(xml:string):WebResult[] {
  if(Buffer.byteLength(xml)>1_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error("Busca inválida.");
  const parsed=new XMLParser({ignoreAttributes:true,parseTagValue:false}).parse(xml);
  const items=parsed?.rss?.channel?.item;
  const list=Array.isArray(items)?items:items?[items]:[];
  const seen=new Set<string>();
  return list.flatMap(item=>{
    const url=publicSourceUrl(item?.link),title=text(item?.title,180);
    if(!url||!title||seen.has(url))return [];
    seen.add(url);return [{url,title,snippet:text(item?.description,450)}];
  }).slice(0,5);
}
export function relevantResults(results:WebResult[],query:string):WebResult[]{
  const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const ignore=new Set("como para uma que qual quero preciso sistema projeto criar construir com meu minha documentacao documentos guia exemplos linguagem voce pode sobre dos das por sem sao uma este esta isso onde quando porque".split(" "));
  const words=[...new Set(normalize(query).match(/[a-z0-9]{3,}/g)??[])].filter(word=>!ignore.has(word));
  if(!words.length)return [];
  return results.filter(result=>{
    const content=normalize(result.title+" "+result.snippet);
    return words.filter(word=>content.includes(word)).length>=Math.min(2,words.length);
  });
}
async function boundedText(response:Response):Promise<string>{
  if(!response.ok||!response.body)throw new Error("Fonte indisponível.");
  const reader=response.body.getReader(),decoder=new TextDecoder();let result="",size=0;
  try{
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
      if(size>1_000_000){await reader.cancel();throw new Error("Resposta muito grande.");}
      result+=decoder.decode(part.value,{stream:true});}
    return result+decoder.decode();
  }finally{reader.releaseLock();}
}
export async function searchWeb(query:string,signal:AbortSignal):Promise<WebResearch>{
  const term=query.trim().slice(0,4000);
  if(!term)throw new Error("Pesquisa vazia.");
  const options={headers:{"User-Agent":"A3X-Research/1.0 (public search)"},cache:"no-store" as const,redirect:"error" as const};
  try{
    const url=new URL("https://www.bing.com/search");url.searchParams.set("format","rss");url.searchParams.set("q",term);url.searchParams.set("mkt","pt-BR");
    const response=await fetch(url,{...options,signal:AbortSignal.any([signal,AbortSignal.timeout(10_000)])});
    const results=relevantResults(parseSearchRss(await boundedText(response)),term);
    if(results.length)return {source:"Bing",results};
  }catch{signal.throwIfAborted();}
  const url=new URL("https://pt.wikipedia.org/w/api.php");
  for(const [key,value] of Object.entries({action:"query",list:"search",srsearch:term,format:"json",srlimit:"5"}))url.searchParams.set(key,value);
  const response=await fetch(url,{...options,signal:AbortSignal.any([signal,AbortSignal.timeout(10_000)])});
  const data=JSON.parse(await boundedText(response));
  const list:unknown[]=Array.isArray(data?.query?.search)?data.query.search:[];
  const results=list.flatMap(item=>{
    const row=item as Record<string,unknown>;
    if(!Number.isSafeInteger(row.pageid)||Number(row.pageid)<=0)return [];
    const title=text(row.title,180);if(!title)return [];
    return [{title,snippet:text(row.snippet,450),url:`https://pt.wikipedia.org/?curid=${row.pageid}`}];
  }).slice(0,5);
  return {source:"Wikipedia",results};
}
const markdown=(value:string)=>value.replace(/[\\`*_{}\[\]<>#!|]/g,"\\$&");
export function researchMarkdown(research:WebResearch):string{
  const intro=research.source==="Wikipedia"?"Busca enciclopédica na Wikipedia (alternativa à busca geral).":"Pesquisa na web via Bing.";
  if(!research.results.length)return `${intro}\n\nNão encontrei resultados para esta consulta. Tente termos mais curtos ou específicos. Nenhuma resposta foi inventada.`;
  return `${intro}\n\nResultados e trechos encontrados — sem síntese por modelo de IA:\n\n`+
    research.results.map((r,i)=>`### ${i+1}. ${markdown(r.title)}\n\n${markdown(r.snippet)}\n\n[Fonte: ${new URL(r.url).hostname}](${r.url})`).join("\n\n")+
    "\n\nConfira as páginas originais: trechos de busca podem estar incompletos ou desatualizados.";
}
