import {NextResponse} from "next/server";
import {getUser,validOrigin} from "@/lib/security";
import {db} from "@/lib/db";
import {isJson,parseJson,apiError,isUuid} from "@/lib/http";
import {ensureDotSettings,scanDotUser,queueDotInvestigation} from "@/lib/dot-engine";
import {validateDotSettings,DOT_LIMITS} from "@/lib/dot-policy";
import {selectedProvider,openAIBudgetMicros,openAIConfigured} from "@/lib/ai-provider";
import {dispatchEngineering} from "@/lib/engineering-dispatch";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(){try{
 const user=await getUser();if(!user)return apiError("Faça login.",401);
 if(process.env.A3X_DOT_ENABLED!=="0")await scanDotUser(user.id);else await ensureDotSettings(user.id);
 const settings=await db.query("SELECT enabled,luna_enabled,quiet,animations,main_agent,theme,suggestion_minutes,last_scan_at,last_paid_at FROM dot_settings WHERE user_id=$1",[user.id]);
 const findings=await db.query("SELECT id,task_id,kind,code,message,created_at FROM dot_findings WHERE user_id=$1 AND active AND NOT dismissed AND (kind<>'memory' OR EXISTS(SELECT 1 FROM cognitive_records WHERE user_id=$1 AND status='pending')) ORDER BY created_at DESC LIMIT 30",[user.id]);
 const tasks=await db.query("SELECT id,goal,status,stage,attempts,run_id,pr_number,result,updated_at FROM engineering_tasks WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20",[user.id]);
 const memory=await db.query<{approved:number;pending:number}>("SELECT COUNT(*) FILTER(WHERE status='approved')::int approved,COUNT(*) FILTER(WHERE status='pending')::int pending FROM cognitive_records WHERE user_id=$1",[user.id]);
 const jobs=await db.query("SELECT engineering_task_id,source_task_id,calls,allocated_micros,created_at FROM dot_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10",[user.id]);
 return NextResponse.json({settings:settings.rows[0],findings:findings.rows,tasks:tasks.rows,memory:memory.rows[0],jobs:jobs.rows,limits:DOT_LIMITS,cloudConsent:await selectedProvider(user.id)==="openai",configured:openAIConfigured(),globalPaused:process.env.A3X_DOT_ENABLED==="0"},{headers});
 }catch{return apiError("Agentes indisponíveis. Confira a migração 018.",503);}}
export async function POST(req:Request){try{
 if(!validOrigin(req)||!isJson(req))return apiError("Origem inválida.",403);const user=await getUser();if(!user)return apiError("Faça login.",401);const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
 if(b.action==="dismiss"&&typeof b.id==="string"&&isUuid(b.id)&&Object.keys(b).length===2){await db.query("UPDATE dot_findings SET dismissed=TRUE WHERE id=$1 AND user_id=$2",[b.id,user.id]);return NextResponse.json({ok:true},{headers});}
 if(b.action!=="settings")return apiError("Ação inválida.");let s;try{s=validateDotSettings(b);}catch{return apiError("Confira as preferências e confirme o consentimento da Luna.");}
 if(s.luna_enabled&&(!openAIConfigured()||await selectedProvider(user.id)!=="openai"))return apiError("Autorize a Luna no seletor de modelo antes de ativar o Nível 2.",409);
 if(s.luna_enabled&&openAIBudgetMicros()>5000000)return apiError("O teto compartilhado não pode exceder US$5.",409);
 await ensureDotSettings(user.id);const c=await db.connect();try{
  await c.query("BEGIN");await c.query("SELECT user_id FROM dot_settings WHERE user_id=$1 FOR UPDATE",[user.id]);
  await c.query("UPDATE dot_settings SET enabled=$2,luna_enabled=$3,consent_at=CASE WHEN $3 THEN NOW() ELSE NULL END,quiet=$4,animations=$5,main_agent=$6,theme=$7,suggestion_minutes=$8,updated_at=NOW() WHERE user_id=$1",[user.id,s.enabled,s.luna_enabled,s.quiet,s.animations,s.main_agent,s.theme,s.suggestion_minutes]);
  if(!s.enabled||!s.luna_enabled)await c.query("UPDATE engineering_tasks SET status='paused',lease_until=NULL,updated_at=NOW() WHERE user_id=$1 AND status IN ('queued','running') AND id IN(SELECT engineering_task_id FROM dot_jobs WHERE user_id=$1)",[user.id]);
  await c.query("COMMIT");
 }catch(error){await c.query("ROLLBACK").catch(()=>{});throw error;}finally{c.release();}
 const id=s.enabled&&s.luna_enabled&&process.env.A3X_DOT_ENABLED!=="0"?await queueDotInvestigation(user.id).catch(()=>null):null;
 const dispatch=id?await dispatchEngineering(id,user.id).catch(()=>"unavailable"):undefined;
 return NextResponse.json({ok:true,taskId:id,dispatch},{headers});
 }catch{return apiError("Não foi possível atualizar os agentes. Nenhuma preferência foi confirmada.",503);}}
