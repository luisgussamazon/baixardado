import { db } from "./db";
import { searchWeb,publicSourceUrl,type WebResult } from "./web-search";
import { normalize } from "./cognitive/interpret";
export const STUDY_TOPICS=[
  {id:"programacao",title:"Programação e desenvolvimento de sistemas",query:"programação desenvolvimento sistemas documentação arquitetura testes",terms:["programacao","sistema","software","typescript","javascript","python","codigo","api","teste"]},
  {id:"logistica",title:"Logística e planejamento",query:"logística planejamento operacional distribuição transporte conceitos",terms:["logistica","planejamento","transporte","distribuicao","rota","frete","lead time"]},
  {id:"estoque",title:"Inventário e controle de estoque",query:"inventário estoque acuracidade contagem cíclica ponto reposição",terms:["inventario","estoque","acuracidade","contagem","ciclica","sku","reposicao"]},
] as const;
export type StudyNote={topic:string;title:string;sources:WebResult[];collected_at:string};
export async function runDueStudy():Promise<boolean>{
  if(process.env.A3X_AUTO_STUDY==="0")return false;
  const lease=await db.query<{id:boolean}>(`UPDATE autonomous_study_state SET busy_until=NOW()+INTERVAL '2 minutes',next_run_at=NOW()+INTERVAL '24 hours'
    WHERE id=true AND next_run_at<=NOW() AND (busy_until IS NULL OR busy_until<NOW()) RETURNING id`);
  if(!lease.rowCount)return false;
  const run=await db.query<{id:string}>("INSERT INTO autonomous_study_runs DEFAULT VALUES RETURNING id");
  let sourceCount=0,completed=0;
  try{
    const results=await Promise.allSettled(STUDY_TOPICS.map(topic=>searchWeb(topic.query,AbortSignal.timeout(8000))));
    for(const [index,result] of results.entries()){
      if(result.status!=="fulfilled"||!result.value.results.length)continue;
      const topic=STUDY_TOPICS[index],sources=result.value.results.slice(0,3).flatMap(item=>{
        const url=publicSourceUrl(item.url);return url?[{title:item.title.slice(0,180),snippet:item.snippet.slice(0,250),url}]:[];
      });
      if(!sources.length)continue;
      await db.query(`INSERT INTO autonomous_study_notes(topic,title,sources) VALUES($1,$2,$3::jsonb)
        ON CONFLICT(topic) DO UPDATE SET title=EXCLUDED.title,sources=EXCLUDED.sources,collected_at=NOW()`,[topic.id,topic.title,JSON.stringify(sources)]);
      sourceCount+=sources.length;completed++;
    }
    await db.query("UPDATE autonomous_study_runs SET finished_at=NOW(),topics=$2,sources=$3,status=$4 WHERE id=$1",[run.rows[0].id,completed,sourceCount,completed===3?"completed":completed?"partial":"failed"]);
    return true;
  }catch{
    await db.query("UPDATE autonomous_study_runs SET finished_at=NOW(),status='failed' WHERE id=$1",[run.rows[0].id]).catch(()=>{});return false;
  }finally{await db.query("UPDATE autonomous_study_state SET busy_until=NULL,last_run_at=NOW() WHERE id=true").catch(()=>{});}
}
export async function studyReferences(message:string):Promise<StudyNote[]>{
  const text=normalize(message),ids=STUDY_TOPICS.filter(topic=>topic.terms.some(term=>text.includes(term))).map(topic=>topic.id);
  if(!ids.length)return [];
  const result=await db.query<StudyNote>("SELECT topic,title,sources,collected_at::text FROM autonomous_study_notes WHERE topic=ANY($1::text[]) ORDER BY collected_at DESC LIMIT 2",[ids]);
  return result.rows;
}
export function studyContext(notes:StudyNote[]){
  return notes.slice(0,2).flatMap(note=>note.sources.slice(0,2).map(source=>({topic:note.title,date:note.collected_at,verified:false,title:source.title.slice(0,100),text:source.snippet.slice(0,200),url:source.url})));
}
