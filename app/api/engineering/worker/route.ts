import {NextResponse} from "next/server";
import {verifyEngineeringToken} from "@/lib/autonomy-oidc";
import {claimEngineering,prepareEngineering,ownedLease,engineeringEvent} from "@/lib/engineering-engine";
import {db} from "@/lib/db";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
import {ENGINEERING_AGENTS,type EngineeringAgent} from "@/lib/engineering-policy";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=240;
export async function POST(req:Request){
 if(!isJson(req))return apiError("Dados inválidos.",403);let identity;try{identity=await verifyEngineeringToken(req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1]??"");}catch{return apiError("Runner não autorizado.",401);}
 let id:string|undefined;try{if(process.env.A3X_ENGINEERING_ENABLED==="0")return apiError("Runner pausado.",409);const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
  if(b.action==="claim"&&Object.keys(b).length===1)return NextResponse.json({task:await claimEngineering(identity)},{headers:{"Cache-Control":"no-store"}});
  if(typeof b.id!=="string"||!isUuid(b.id))return apiError("Tarefa inválida.");id=b.id;
  if(b.action==="prepare"&&Object.keys(b).length===2)return NextResponse.json(await prepareEngineering(id,identity,req.signal),{headers:{"Cache-Control":"no-store"}});
  const task=await ownedLease(id,identity);
  if(["heartbeat","authorize"].includes(String(b.action))&&Object.keys(b).length===2){if(b.action==="authorize"&&!task)return apiError("Tarefa indisponível.",409);await db.query("UPDATE engineering_tasks SET lease_until=NOW()+INTERVAL '30 minutes' WHERE id=$1 AND run_id=$2 AND status='running'",[id,identity.runId]);return NextResponse.json({ok:true});}
  if(b.action==="event"&&Object.keys(b).every(k=>["action","id","agent","state","code"].includes(k))&&ENGINEERING_AGENTS.includes(b.agent as EngineeringAgent)&&["running","passed","failed","waiting","skipped"].includes(String(b.state))&&typeof b.code==="string"&&/^[a-z0-9-]{1,80}$/.test(b.code)){
   await engineeringEvent(id,b.agent as EngineeringAgent,String(b.state),b.code);await db.query("UPDATE engineering_tasks SET stage=$2,updated_at=NOW() WHERE id=$1 AND run_id=$3 AND status='running'",[id,b.agent,identity.runId]);return NextResponse.json({ok:true});
  }
  if(b.action==="finish"&&Object.keys(b).every(k=>["action","id","status","commit","pr","metrics"].includes(k))&&["review","completed","failed"].includes(String(b.status))&&(b.commit===undefined||typeof b.commit==="string"&&/^[a-f0-9]{40}$/.test(b.commit))&&(b.pr===undefined||Number.isSafeInteger(b.pr)&&Number(b.pr)>0)){
   if(b.status==="review"&&(!b.commit||!b.pr))return apiError("PR obrigatório.");
   const metrics=b.metrics as Record<string,unknown>|undefined;if(metrics&&(!metrics||typeof metrics!=="object"||Array.isArray(metrics)||Object.keys(metrics).some(k=>!["baselineMs","candidateMs","changedBytes"].includes(k))||Object.values(metrics).some(v=>typeof v!=="number"||!Number.isFinite(v)||Math.abs(v)>10_000_000)))return apiError("Métricas inválidas.");
   await db.query("UPDATE engineering_tasks SET status=$3,stage='evolution',experimental_sha=$4,pr_number=$5,result=COALESCE(result,'{}'::jsonb)||$6::jsonb,lease_until=NULL,updated_at=NOW() WHERE id=$1 AND run_id=$2 AND status='running'",[id,identity.runId,b.status,b.commit??null,b.pr??null,JSON.stringify({metrics:metrics??null})]);await engineeringEvent(id,"evolution",b.status==="failed"?"failed":"passed",b.status==="review"?"PR criado; aguardando aprovação independente. Nenhum deploy executado.":b.status==="completed"?"Validação concluída e registrada.":"Execução interrompida. Nenhuma integração autorizada.");return NextResponse.json({ok:true});
  }
  return apiError("Ação inválida.");
 }catch{if(id){await db.query("UPDATE engineering_tasks SET status='failed',stage='evolution',lease_until=NULL,updated_at=NOW() WHERE id=$1 AND run_id=$2 AND status='running'",[id,identity.runId]).catch(()=>{});await engineeringEvent(id,"evolution","failed","Etapa interrompida. Respostas brutas e credenciais omitidas.").catch(()=>{});}return apiError("Etapa interrompida ou tarefa pausada/cancelada.",409);}
}
