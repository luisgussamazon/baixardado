export const INVENTORY_ORIGIN="https://icqa-tool-production.up.railway.app";
export const BROWSER_PATHS=["/","/schedule","/dashboard","/inventory","/inventories","/reports"] as const;
export function browserNavigationRequest(message:string){
 const text=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const match=text.match(/^(?:por favor[, ]+)?(?:abra|abrir|acesse|acessar|navegue para|va para|ir para)\s+(?:(?:o|a|os|as|pagina de|tela de)\s+)?(cronograma|schedule|dashboard|inicio|inventario|inventarios|estoque|relatorios)[.!?]?$/);
 if(!match)return null;
 const paths:Record<string,string>={cronograma:"/schedule",schedule:"/schedule",dashboard:"/dashboard",inicio:"/",inventario:"/inventory",inventarios:"/inventories",estoque:"/inventory",relatorios:"/reports"};
 return {url:INVENTORY_ORIGIN+paths[match[1]],label:match[1]};
}
export function browserPageUrl(value:unknown):string|null{
 if(typeof value!=="string"||value.length>500)return null;
 try{const url=new URL(value);return url.origin===INVENTORY_ORIGIN&&!url.username&&!url.password&&!url.search&&!url.hash&&BROWSER_PATHS.some(path=>path===url.pathname)?url.href:null;}catch{return null;}
}
export type BrowserObservation={url:string;title:string;text:string};
export function validateObservation(value:unknown):BrowserObservation|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const body=value as Record<string,unknown>;
 if(Object.keys(body).some(key=>!["url","title","text"].includes(key)))return null;
 // A captura pode vir de uma subpágina, mas nunca guarda query, fragmento ou credenciais.
 if(typeof body.url!=="string"||body.url.length>1000)return null;
 let url:URL;try{url=new URL(body.url);}catch{return null;}
 if(url.origin!==INVENTORY_ORIGIN||url.username||url.password||url.search||url.hash||url.pathname.includes("%")||/^\/(?:api|login|logout|auth)(?:\/|$)/i.test(url.pathname))return null;
 if(typeof body.title!=="string"||body.title.length>180||/[\u0000-\u001f]/.test(body.title)||typeof body.text!=="string"||!body.text.trim()||body.text.length>6000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.text))return null;
 return {url:url.href,title:body.title.trim(),text:body.text.trim()};
}
