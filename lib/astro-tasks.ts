import {randomUUID} from "node:crypto";
import {db} from "./db";
import {SOURCE_REPOSITORY} from "./source-policy";

// Each worker owns a fresh lease. Expired work fails closed and is never replayed
// automatically after it may have modified a worktree.
export async function claimAstroTask(){
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(87540)");
    await client.query(`WITH expired AS (
      UPDATE astro_tasks SET status='FAILED',lease_token=NULL,lease_until=NULL,updated_at=NOW()
      WHERE lease_until<NOW() RETURNING id
    ) INSERT INTO astro_events(task_id,status,summary)
      SELECT id,'FAILED','Executor desconectado. Confira o worktree antes de criar outra tarefa.' FROM expired`);
    const token=randomUUID();
    const task=await client.query(`UPDATE astro_tasks SET status='ANALYZING',
      lease_token=$1,lease_until=NOW()+INTERVAL '2 minutes',attempts=attempts+1,updated_at=NOW()
      WHERE id=(SELECT id FROM astro_tasks WHERE status='PENDING' AND NOT cancel_requested
        AND attempts<3 AND repository=$2
        AND NOT EXISTS(SELECT 1 FROM astro_tasks WHERE repository=$2 AND lease_token IS NOT NULL)
        ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING id,user_id,repository,goal,lease_token`,[token,SOURCE_REPOSITORY]);
    if(task.rows[0])await client.query(
      "INSERT INTO astro_events(task_id,status,summary) VALUES($1,'ANALYZING','Executor iniciou a análise.')",
      [task.rows[0].id]);
    await client.query("COMMIT");
    return task.rows[0]??null;
  }catch(error){
    await client.query("ROLLBACK").catch(()=>{});
    throw error;
  }finally{client.release();}
}

export async function renewAstroLease(id:string,token:string){
  const result=await db.query(`UPDATE astro_tasks SET lease_until=NOW()+INTERVAL '2 minutes'
    WHERE id=$1 AND lease_token=$2 AND lease_until>NOW() AND NOT cancel_requested
    RETURNING id`,[id,token]);
  return result.rows.length===1;
}
