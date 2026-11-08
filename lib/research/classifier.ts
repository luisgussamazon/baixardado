// Avaliador offline de tópicos. Não substitui o interpretador/roteador do Chat.
import { normalize as normalizeConversation } from "../cognitive/interpret";
export const LABELS=["web_search","knowledge","programming","deployment","git","costs","capabilities","greeting"] as const;
export type Label=typeof LABELS[number];
export type Intent=Label|"clarify";
export type Policy={version:number;intents:Record<Label,{phrases:string[];tokens:string[]}>};
export type Case={text:string;intent:Intent};
export const normalize=(value:string)=>normalizeConversation(value).replace(/[^a-z0-9+#.\s-]/g," ").replace(/\s+/g," ").trim();
const STOP=new Set("a o e os as eu voce voce? de da do dos das para por com sem um uma me meu minha meus minhas seu sua quero preciso gostaria pode poderia como qual quais onde quando porque que tem sobre mais preciso isso isto ai ia a3x tambem ainda so apenas ja tudo faz fazer isso".split(/\s+/));
const FOLLOWUPS=new Set(["como faco","e agora","me explica melhor","explique melhor","continue","continuar","proximo passo","quero detalhes","mais detalhes","e depois","mostre o passo a passo"]);
export function tokens(value:string){return [...new Set(normalize(value).split(" ").filter(x=>x.length>=3&&!STOP.has(x)))].slice(0,35);}
export function validatePolicy(value:unknown):asserts value is Policy{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Política inválida.");
  const p=value as Policy;
  if(Object.keys(p).some(key=>!["version","intents"].includes(key))||!Number.isSafeInteger(p.version)||p.version<1||p.version>10000||!p.intents||typeof p.intents!=="object")throw new Error("Política inválida.");
  if(Object.keys(p.intents).length!==LABELS.length||LABELS.some(label=>!Object.hasOwn(p.intents,label)))throw new Error("Categorias incompatíveis.");
  for(const label of LABELS){
    const spec=p.intents[label];
    if(!spec||Object.keys(spec).some(key=>!["phrases","tokens"].includes(key))||!Array.isArray(spec.phrases)||!Array.isArray(spec.tokens)||spec.phrases.length>35||spec.tokens.length>50)throw new Error("Listas fora dos limites.");
    for(const term of [...spec.phrases,...spec.tokens])if(typeof term!=="string"||!term.trim()||term.length>65||/[\x00-\x1f]/.test(term))throw new Error("Termo inválido.");
  }
}
export function classify(text:string,policy:Policy,context:{lastIntent?:Intent|null}={}){
  validatePolicy(policy);
  if(typeof text!=="string"||!text.trim()||text.length>4000||text.includes("\0"))return {intent:"clarify" as Intent,confidence:0,evidence:[] as string[]};
  const input=normalize(text);
  if(/\b(?:minha senha|meu token|chave secreta|api[ _-]?key|database[ _-]?url|private key|credencial privada)\b/.test(input))return {intent:"clarify" as Intent,confidence:0,evidence:["consulta sensível; nenhuma busca executada"]};
  if(/^(?:pesquise|pesquisa|busque|buscar|procure|consulte|busca na web)\b/.test(input))return {intent:"web_search" as Intent,confidence:1,evidence:["pedido explícito; classificação não executa pesquisa"]};
  if(FOLLOWUPS.has(input)&&context.lastIntent&&LABELS.includes(context.lastIntent as Label))return {intent:context.lastIntent,confidence:.93,evidence:["continuidade explícita"]};
  const words=new Set(tokens(input));
  const ranked:{intent:Label;score:number;evidence:string[]}[]=[];
  for(const intent of LABELS){
    let score=0;const evidence:string[]=[];
    for(const phrase of policy.intents[intent].phrases){
      const term=normalize(phrase);
      if(term&&(input===term||input.includes(" "+term+" ")||input.startsWith(term+" ")||input.endsWith(" "+term))){score+=4+Math.min(2,term.split(" ").length-1);evidence.push("frase: "+term);}
    }
    for(const term of policy.intents[intent].tokens)if(words.has(normalize(term))){score+=2;evidence.push("palavra: "+term);}
    if(score>0)ranked.push({intent,score,evidence});
  }
  ranked.sort((a,b)=>b.score-a.score||LABELS.indexOf(a.intent)-LABELS.indexOf(b.intent));
  if(!ranked.length||ranked[0].score<2)return {intent:"clarify" as Intent,confidence:0,evidence:[]};
  const best=ranked[0],second=ranked[1];
  if(second&&best.score===second.score&&best.score<5)return {intent:"clarify" as Intent,confidence:.3,evidence:[]};
  return {intent:best.intent as Intent,confidence:Number(Math.min(.97,.52+best.score/25+(best.score-(second?.score??0))/40).toFixed(2)),evidence:best.evidence.slice(0,5)};
}
