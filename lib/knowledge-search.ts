import { db } from "@/lib/db";
import { safeKnowledgeUrl } from "@/lib/knowledge-data.mjs";

export type KnowledgeHit = {
  id:string;topic:string;title:string;question:string;answer:string;source_url:string|null;
  scope:"global"|"private";score:number;matched:number;covered:number;
};
const stop = new Set("como faco fazer faz uso usar significa criar escrever armazeno armazenar posso consegue pode somente qual que uma para com sem por meu minha meus minhas voce sobre entre outros outro segura seguro proteger diferenca sao esta tem foi agora cidade".split(" "));
export function knowledgeTerms(query:string):string[]{
  const text=query.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/next\.js/g,"nextjs").replace(/postgresql/g,"postgres");
  const aliases:Record<string,string>={promises:"promise",funcoes:"funcao",indices:"indice",aprender:"treinar",aprende:"treinar",js:"javascript"};
  return [...new Set((text.match(/[a-z0-9_]{2,}/g)??[]).filter(term=>!stop.has(term)).map(term=>aliases[term]??term))].slice(0,24);
}

export async function searchKnowledge(query:string,userId:string,limit=3):Promise<KnowledgeHit[]>{
  if(!query.trim()||query.length>4000||query.includes("\0"))return [];
  const normalized=query.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(/^(qual|mostre|revele|me diga).*\b(senha|token|chave)\b.*\b(minha|meu|conta)\b/.test(normalized)||/\b(hackeia|hackear|invadir)\b/.test(normalized))return [];
  const terms=knowledgeTerms(query);
  if(!terms.length)return [];
  const safeLimit=Number.isFinite(limit)?Math.max(1,Math.min(5,Math.floor(limit))):3;
  const result=await db.query<KnowledgeHit>(`WITH q AS (
    SELECT websearch_to_tsquery('portuguese',$1)||websearch_to_tsquery('simple',$1) AS query
  ), candidates AS (
    SELECT k.id,k.topic,k.title,k.question,k.answer,k.source_url,
      CASE WHEN k.owner_user_id IS NULL THEN 'global' ELSE 'private' END AS scope,
      ts_rank_cd(k.search_vector,q.query,32) AS score,
      (SELECT COUNT(*)::int FROM unnest($4::text[]) term WHERE
        k.focus_vector @@ (plainto_tsquery('portuguese',term)||plainto_tsquery('simple',term))) AS matched,
      (SELECT COUNT(*)::int FROM unnest($4::text[]) term WHERE
        k.search_vector @@ (plainto_tsquery('portuguese',term)||plainto_tsquery('simple',term))) AS covered
    FROM knowledge_entries k CROSS JOIN q
    WHERE k.is_active AND (k.owner_user_id IS NULL OR k.owner_user_id=$2::uuid)
      AND k.search_vector @@ q.query
  ) SELECT * FROM candidates WHERE matched >= 1 AND covered >= $5
    ORDER BY matched DESC,covered DESC,score DESC,scope DESC,id ASC LIMIT $3`,
    [terms.join(" OR "),userId,safeLimit,terms,Math.min(2,terms.length)]);
  return result.rows;
}

const escaped=(value:string)=>value.replace(/[\\`*_{}\[\]<>#!|]/g,"\\$&");
export function knowledgeMarkdown(hits:KnowledgeHit[]):string{
  return "**Base de Conhecimento A3X — conteúdo recuperado, sem geração por IA.**\n\n"+
    hits.map(hit=>{
      let url:string|null=null;
      try{url=safeKnowledgeUrl(hit.source_url);}catch{/* Fonte inválida não vira link. */}
      const source=url?`[Referência cadastrada](${url})`:"Sem URL de referência cadastrada.";
      return `### ${escaped(hit.title)}\n\n`+
        hit.answer.split("\n").map(line=>`> ${escaped(line)}`).join("\n")+
        `\n\n**Origem:** ${hit.scope==="private"?"seu conteúdo privado":"base global A3X AI"} · Registro: ${escaped(hit.id)}\n\n${source}`;
    }).join("\n\n---\n\n")+
    "\n\nTrechos cadastrados na base; as páginas de referência não foram abertas nesta resposta. Confira se o conteúdo atende à sua pergunta.";
}
