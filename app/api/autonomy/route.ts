import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getUser} from "@/lib/security";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
import {verifyAutonomyToken} from "@/lib/autonomy-oidc";
import {autonomousCycle,AutonomyCycleError} from "@/lib/autonomy-cycle";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=240;
export async function GET(){try{if(!await getUser())return apiError("Faça login.",401);const policy=await db.query("SELECT enabled,updated_at FROM autonomy_policy WHERE id=1"),runs=await db.query("SELECT id,github_run_id,status,summary,commit_sha,created_at,finished_at FROM autonomy_cycles ORDER BY created_at DESC LIMIT 20");return NextResponse.json({policy:policy.rows[0],runs:runs.rows,serverDisabled:process.env.A3X_AUTONOMY_ENABLED==="0"},{headers:{"Cache-Control":"private, no-store"}});}catch{return apiError("Autonomia indisponível.",503);}}
export async function POST(req:Request){
 if(!isJson(req))return apiError("Solicitação inválida.",403);
 let identity;try{const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];if(!token)return apiError("Execução não autorizada.",401);identity=await verifyAutonomyToken(token);}catch{return apiError("Execução não autorizada.",401);}
 try{const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
  if(b.action==="pause"&&Object.keys(b).length===1&&identity.event==="workflow_dispatch"){await db.query("UPDATE autonomy_policy SET enabled=FALSE,updated_at=NOW() WHERE id=1");return NextResponse.json({ok:true});}
  if(b.action==="authorize"&&typeof b.id==="string"&&isUuid(b.id)&&Object.keys(b).length===2){const r=await db.query("SELECT c.id FROM autonomy_cycles c JOIN autonomy_policy p ON p.id=1 WHERE c.id=$1 AND c.github_run_id=$2 AND c.status='ready' AND p.enabled AND c.created_at>NOW()-INTERVAL '30 minutes'",[b.id,identity.runId]);return r.rows.length&&process.env.A3X_AUTONOMY_ENABLED!=="0"?NextResponse.json({ok:true}):apiError("Publicação pausada ou expirada.",409);}
  if(b.action==="finish"&&typeof b.id==="string"&&isUuid(b.id)&&["failed","published","deployed"].includes(String(b.status))&&Object.keys(b).every(k=>["action","id","status","commit"].includes(k))&&(b.commit===undefined||typeof b.commit==="string"&&/^[a-f0-9]{40}$/.test(b.commit))){const r=await db.query("UPDATE autonomy_cycles SET status=$3,commit_sha=$4,finished_at=NOW() WHERE id=$1 AND github_run_id=$2 AND status IN ('ready','published') RETURNING id",[b.id,identity.runId,b.status,b.commit??null]);if(!r.rows.length)return apiError("Ciclo indisponível.",404);if(b.status==="failed")await db.query("UPDATE autonomy_policy SET enabled=FALSE,updated_at=NOW() WHERE id=1");return NextResponse.json({ok:true});}
  if(b.action!=="run"||Object.keys(b).some(k=>!["action","enable"].includes(k))||(b.enable!==undefined&&typeof b.enable!=="boolean"))return apiError("Ação inválida.");
  return NextResponse.json(await autonomousCycle(identity,b.enable===true,req.signal),{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:"Ciclo interrompido. Confira o orçamento, a política e o histórico do GitHub.",code:error instanceof AutonomyCycleError?error.code:"policy-or-state"},{status:409,headers:{"Cache-Control":"no-store"}});}
}
