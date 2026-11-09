import {JSDOM} from "jsdom";
import {redactLearningText,type LearningDocument} from "../lib/local-learning";
export const INVENTORY_ORIGIN="https://icqa-tool-production.up.railway.app";
export async function observeInventoryFront(address:string):Promise<LearningDocument>{
  let url=new URL(address);if(url.origin!==INVENTORY_ORIGIN||url.username||url.password||url.pathname!=="/login"||[...url.searchParams.keys()].some(key=>key!=="next"))throw new Error("Somente a tela pública de login autorizada.");
  const signal=AbortSignal.timeout(15000);let response:Response|undefined;
  for(let redirects=0;redirects<4;redirects++){
    response=await fetch(url,{method:"GET",redirect:"manual",signal,headers:{Accept:"text/html","User-Agent":"A3X-Public-ReadOnly/1.0"}});
    if(response.status>=300&&response.status<400){const next=new URL(response.headers.get("location")||"",url);if(next.origin!==INVENTORY_ORIGIN||next.username||next.password||next.pathname!=="/login")throw new Error("Redirecionamento fora da tela autorizada.");await response.body?.cancel();url=next;response=undefined;continue;}break;
  }
  if(!response?.ok||!response.body||!response.headers.get("content-type")?.includes("text/html"))throw new Error("Tela pública indisponível; nenhuma autenticação será tentada.");
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let bytes=0;
  try{for(;;){const item=await reader.read();if(item.done)break;bytes+=item.value.length;if(bytes>256000)throw new Error("Página acima do limite.");parts.push(item.value);}}finally{await reader.cancel();}
  // JSDOM sem runScripts/resources: não executa JavaScript nem carrega imagens/recursos.
  const dom=new JSDOM(Buffer.concat(parts).toString("utf8"),{url:url.href});
  try{
    const document=dom.window.document;
    document.querySelectorAll("script,style,template").forEach(node=>node.remove());
    const clean=(value:string)=>redactLearningText(value).replace(/\s+/g," ").slice(0,160);
    const labels=[...new Set([...document.querySelectorAll("h1,h2,label,button")].map(node=>clean(node.textContent||"")).filter(Boolean))].slice(0,12);
    const links=[...new Set([...document.querySelectorAll("a[href]")].flatMap(node=>{try{const target=new URL(node.getAttribute("href")!,url);return target.origin===INVENTORY_ORIGIN?[target.pathname]:[];}catch{return [];}}))].slice(0,12);
    return {name:"frontend-observado.md",text:`# Observação pública do frontend ICQA\n\nData: ${new Date().toISOString()}\nOrigem: ${INVENTORY_ORIGIN}/login\nTítulo: ${clean(document.title)}\nElementos observados: ${labels.join("; ")}\nCaminhos presentes em links, não visitados: ${links.join(", ")}\n\nSomente HTML público da tela de login foi lido. JavaScript não foi executado. Nenhum formulário foi enviado, sessão copiada ou valor de input registrado. Inventários, áreas, mapas, cronograma e demais telas autenticadas NÃO foram observados. Os fluxos do pacote são documentação, não comprovação do estado atual do site.`};
  }finally{dom.window.close();}
}
