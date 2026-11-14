import {insertEngineeringTask,EngineeringQueueLimit} from "@/lib/engineering-queue";
import {NextResponse} from "next/server";
import {getUser,validOrigin} from "@/lib/security";
import {db} from "@/lib/db";
import {dispatchEngineering,immediateEngineeringConfigured} from "@/lib/engineering-dispatch";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
import {newEngineeringTask,canControlTask} from "@/lib/engineering-policy";
import {selectedProvider,OPENAI_MODEL,openAIConfigured,openAIBudgetMicros} from "@/lib/ai-provider";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(req:Request){try{
 const user=await getUser();if(!user)return apiError("Faça login.",401);
 const id=new URL(req.url).searchParams.get("id");if(id&&!isUuid(id))return apiError("Tarefa inválida.");
 const tasks=await db.query("SELECT id,goal,mode,status,stage,attempts,run_id,base_sha,pr_number,experimental_sha,created_at,updated_at,result FROM engineering_tasks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[user.id]);
 let detail=null;if(id){const found=await db.query("SELECT id,proposal FROM engineering_tasks WHERE id=$1 AND user_id=$2",[id,user.id]);if(!found.rows.length)return apiError("Tarefa não encontrada.",404);const events=await db.query("SELECT id,agent,state,message,created_at FROM engineering_events WHERE task_id=$1 ORDER BY id DESC LIMIT 200",[id]);detail={...found.rows[0],events:events.rows.reverse()};}
 const usage=await db.query("SELECT COALESCE(SUM(COALESCE(charged_microusd,reserved_microusd)),0)::text cost,COALESCE(SUM(input_tokens),0)::text input,COALESCE(SUM(output_tokens),0)::text output FROM ai_api_usage WHERE user_id=$1 AND created_at>=(date_trunc('month',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')",[user.id]);
 return NextResponse.json({tasks:tasks.rows,detail,model:{id:OPENAI_MODEL,configured:openAIConfigured(),budgetMicros:openAIBudgetMicros(),usage:usage.rows[0]},runner:{workflow:"a3x-engineering.yml",execution:"GitHub Actions / Docker",immediate:immediateEngineeringConfigured(),productionApproval:true},version:process.env.RAILWAY_GIT_COMMIT_SHA??null},{headers});
 }catch{return apiError("Central indisponível. Verifique as migrações.",503);}}
export async function POST(req:Request){try{
 if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);const user=await getUser();if(!user)return apiError("Faça login.",401);const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
 if(b.action==="create"){
  let task;try{task=newEngineeringTask(b);}catch(error){return apiError(error instanceof Error?error.message:"Informe o objetivo e confirme o consentimento.");}
  if(["develop","integration"].includes(task.mode)&&await selectedProvider(user.id)!=="openai")return apiError("Autorize GPT-6 Luna no Chat antes de enviar código e objetivo à API.",409);
  let createdId="";const c=await db.connect();try{await c.query("BEGIN");createdId=await insertEngineeringTask(c,user.id,task);await c.query("COMMIT");
  }catch(error){await c.query("ROLLBACK").catch(()=>{});if(error instanceof EngineeringQueueLimit)return apiError(error.message,429);throw error;}finally{c.release();}
  const dispatch=await dispatchEngineering(createdId,user.id).catch(()=>"unavailable");return NextResponse.json({id:createdId,dispatch},{status:201,headers});
 }
 if(b.action==="start"&&typeof b.id==="string"&&isUuid(b.id)&&Object.keys(b).length===2){const owned=await db.query("SELECT id FROM engineering_tasks WHERE id=$1 AND user_id=$2",[b.id,user.id]);if(!owned.rows.length)return apiError("Tarefa n\u00e3o encontrada.",404);return NextResponse.json({ok:true,dispatch:await dispatchEngineering(b.id,user.id)},{headers});}
 if(typeof b.id!=="string"||!isUuid(b.id)||Object.keys(b).some(k=>!["action","id"].includes(k))||!["pause","resume","cancel","revert"].includes(String(b.action)))return apiError("Ação inválida.");
 const c=await db.connect();try{await c.query("BEGIN");const r=await c.query<{status:string;attempts:number}>("SELECT status,attempts FROM engineering_tasks WHERE id=$1 AND user_id=$2 FOR UPDATE",[b.id,user.id]);const task=r.rows[0];if(!task){await c.query("ROLLBACK");return apiError("Tarefa não encontrada.",404);}if(!canControlTask(task.status,String(b.action))||b.action==="resume"&&task.attempts>=2){await c.query("ROLLBACK");return apiError("Estado incompatível ou tentativas esgotadas.",409);}
  const status=b.action==="pause"?"paused":b.action==="resume"?"queued":"cancelled";await c.query("UPDATE engineering_tasks SET status=$3,lease_until=NULL,run_id=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2",[b.id,user.id,status]);await c.query("INSERT INTO engineering_events(task_id,agent,state,message) VALUES($1,'evolution','waiting',$2)",[b.id,b.action==="revert"?"Versão experimental invalidada. A main não foi alterada; o PR deve ser fechado no GitHub.":"Controle solicitado: "+b.action]);await c.query("COMMIT");
 }catch{await c.query("ROLLBACK").catch(()=>{});throw Error("control");}finally{c.release();}
 const dispatch=b.action==="resume"?await dispatchEngineering(b.id,user.id).catch(()=>"unavailable"):undefined;return NextResponse.json({ok:true,dispatch},{headers});
 }catch{return apiError("Não foi possível atualizar a tarefa.",503);}}
