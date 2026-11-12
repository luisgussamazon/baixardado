import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getUser,validOrigin} from "@/lib/security";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
import {SOURCE_REPOSITORY} from "@/lib/source-policy";
import {selectedProvider} from "@/lib/ai-provider";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};

export async function GET(){
  try{
    const user=await getUser();
    if(!user)return apiError("Faça login.",401);
    const tasks=await db.query(`SELECT id,goal,status,attempts,cancel_requested,created_at,updated_at,
      lease_until>NOW() AS executor_active FROM astro_tasks
      WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,[user.id]);
    const events=await db.query(`SELECT e.id,e.task_id,e.status,e.summary,e.created_at
      FROM astro_events e JOIN astro_tasks t ON t.id=e.task_id
      WHERE t.user_id=$1 ORDER BY e.id DESC LIMIT 100`,[user.id]);
    return NextResponse.json({tasks:tasks.rows,events:events.rows},{headers});
  }catch{return apiError("Fila de tarefas indisponível.",503);}
}

export async function POST(req:Request){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();
    if(!user)return apiError("Faça login.",401);
    const body=await parseJson(req);
    if(!body||Object.keys(body).some(key=>!["goal","consent"].includes(key))||
      typeof body.goal!=="string"||!body.goal.trim()||body.goal.length>4000||body.consent!==true)
      return apiError("Informe o objetivo e autorize o envio à Luna.");
    if(await selectedProvider(user.id)!=="openai")return apiError("Autorize a Luna nas configurações do modelo.",409);
    const client=await db.connect();
    try{
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,87541))",[user.id]);
      const count=await client.query<{total:number}>(
        "SELECT COUNT(*)::int total FROM astro_tasks WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 day'",[user.id]);
      if(count.rows[0].total>=3){
        await client.query("ROLLBACK");
        return apiError("Limite de três tarefas por dia atingido.",429);
      }
      const result=await client.query(
        "INSERT INTO astro_tasks(user_id,repository,goal) VALUES($1,$2,$3) RETURNING id,status",
        [user.id,SOURCE_REPOSITORY,body.goal.trim()]);
      await client.query("INSERT INTO astro_events(task_id,status,summary) VALUES($1,'PENDING','Objetivo recebido. Aguardando o próximo ciclo da Autonomia A3X.')",[result.rows[0].id]);
      await client.query("COMMIT");
      return NextResponse.json(result.rows[0],{status:201,headers});
    }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}
    finally{client.release();}
  }catch{return apiError("Não foi possível criar a tarefa.",503);}
}

export async function PATCH(req:Request){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();
    if(!user)return apiError("Faça login.",401);
    const body=await parseJson(req);
    if(!body||Object.keys(body).some(key=>!["id","action"].includes(key))||
      typeof body.id!=="string"||!isUuid(body.id)||body.action!=="cancel")return apiError("Ação inválida.");
    const result=await db.query(`WITH changed AS (
      UPDATE astro_tasks SET cancel_requested=TRUE,
        status=CASE WHEN status='PENDING' THEN 'CANCELLED' ELSE status END,updated_at=NOW()
      WHERE id=$1 AND user_id=$2 AND NOT cancel_requested
        AND status NOT IN ('APPLYING','COMPLETED','FAILED','ROLLED_BACK','CANCELLED')
      RETURNING id,status
    ) INSERT INTO astro_events(task_id,status,summary)
      SELECT id,status,'Interrupção solicitada pelo usuário.' FROM changed RETURNING task_id`,[body.id,user.id]);
    if(!result.rows.length)return apiError("Tarefa encerrada, indisponível ou interrupção já solicitada.",409);
    return NextResponse.json({ok:true},{headers});
  }catch{return apiError("Não foi possível interromper a tarefa.",503);}
}
