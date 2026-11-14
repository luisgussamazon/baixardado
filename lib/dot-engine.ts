import {db} from "./db";
import {dotFinding,DOT_LIMITS,type DotTask} from "./dot-policy";
import {insertEngineeringTask,EngineeringQueueLimit} from "./engineering-queue";
import {openAIConfigured,openAIBudgetMicros} from "./ai-provider";

export async function ensureDotSettings(userId:string){await db.query("INSERT INTO dot_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING",[userId]);}

/** Deterministic observation only. Row locking + fingerprints make concurrent ticks idempotent. */
export async function scanDotUser(userId:string){
 await ensureDotSettings(userId);const c=await db.connect();
 try{
  await c.query("BEGIN");
  const settings=await c.query<{enabled:boolean;due:boolean}>("SELECT enabled,(last_scan_at IS NULL OR last_scan_at<=NOW()-INTERVAL '15 minutes' OR EXISTS(SELECT 1 FROM engineering_tasks t WHERE t.user_id=$1 AND t.status IN ('queued','failed','review','completed') AND t.updated_at>dot_settings.last_scan_at) OR EXISTS(SELECT 1 FROM cognitive_records r WHERE r.user_id=$1 AND r.status='pending' AND r.created_at>dot_settings.last_scan_at)) AS due FROM dot_settings WHERE user_id=$1 FOR UPDATE",[userId]);
  if(!settings.rows[0]?.enabled||!settings.rows[0].due){await c.query("COMMIT");return false;}
  const tasks=await c.query<DotTask>("SELECT id,status,stage,attempts,pr_number,result FROM engineering_tasks WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50",[userId]);
  const findings=tasks.rows.flatMap(task=>{const f=dotFinding(task);return f?[{task_id:task.id,...f}]:[];});
  if(findings.length)await c.query("INSERT INTO dot_findings(user_id,task_id,fingerprint,kind,code,message) SELECT $1,x.task_id,x.fingerprint,x.kind,x.code,x.message FROM jsonb_to_recordset($2::jsonb) AS x(task_id UUID,fingerprint TEXT,kind TEXT,code TEXT,message TEXT) ON CONFLICT(user_id,fingerprint) DO UPDATE SET active=TRUE",[userId,JSON.stringify(findings)]);
  await c.query("UPDATE dot_findings f SET active=FALSE WHERE f.user_id=$1 AND f.task_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM engineering_tasks t WHERE t.id=f.task_id AND t.user_id=$1 AND CASE t.status WHEN 'failed' THEN 'failure' WHEN 'queued' THEN 'queued' WHEN 'review' THEN 'review' WHEN 'completed' THEN 'completed' ELSE '' END=f.kind)",[userId]);
  const pending=await c.query<{n:number}>("SELECT COUNT(*)::int n FROM cognitive_records WHERE user_id=$1 AND status='pending'",[userId]);
  if(pending.rows[0].n>0)await c.query("INSERT INTO dot_findings(user_id,fingerprint,kind,code,message) VALUES($1,'memory:pending','memory','MEMORY_PENDING','Há memórias aguardando sua aprovação. Deseja analisar?') ON CONFLICT(user_id,fingerprint) DO UPDATE SET active=TRUE",[userId]);
  else await c.query("UPDATE dot_findings SET active=FALSE WHERE user_id=$1 AND fingerprint='memory:pending'",[userId]);
  await c.query("UPDATE dot_settings SET last_scan_at=NOW() WHERE user_id=$1",[userId]);
  await c.query("COMMIT");return true;
 }catch(error){await c.query("ROLLBACK").catch(()=>{});throw error;}finally{c.release();}
}

/** Enqueues a new investigation, never retries a failed generated operation. No model calls here. */
export async function queueDotInvestigation(userId:string){
 if(!openAIConfigured())return null;
 const c=await db.connect();try{
  await c.query("BEGIN");
  const s=await c.query<{enabled:boolean;luna_enabled:boolean;consent_at:Date|null;due:boolean}>("SELECT enabled,luna_enabled,consent_at,(last_paid_at IS NULL OR last_paid_at<NOW()-INTERVAL '24 hours') due FROM dot_settings WHERE user_id=$1 FOR UPDATE",[userId]);
  const settings=s.rows[0];if(!settings?.enabled||!settings.luna_enabled||!settings.consent_at||!settings.due){await c.query("COMMIT");return null;}
  const consent=await c.query("SELECT 1 FROM ai_preferences WHERE user_id=$1 AND provider='openai' AND cloud_consent_version=1 AND cloud_consented_at IS NOT NULL",[userId]);
  const usage=await c.query<{spent:string}>("SELECT COALESCE(SUM(COALESCE(charged_microusd,reserved_microusd)),0)::text spent FROM ai_api_usage WHERE created_at>=(date_trunc('month',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')");
  const budget=openAIBudgetMicros();if(!consent.rows.length||budget>5000000||budget-Number(usage.rows[0].spent)<DOT_LIMITS.taskReservationMicros){await c.query("COMMIT");return null;}
  const found=await c.query<{id:string;result:{failureCode?:string}|null}>("SELECT t.id,t.result FROM engineering_tasks t WHERE t.user_id=$1 AND t.status='failed' AND NOT EXISTS(SELECT 1 FROM dot_jobs j WHERE j.source_task_id=t.id OR j.engineering_task_id=t.id) ORDER BY t.updated_at DESC LIMIT 1",[userId]);
  if(!found.rows[0]){await c.query("COMMIT");return null;}
  const source=found.rows[0];const code=dotFinding({id:source.id,status:"failed",stage:"evolution",attempts:0,pr_number:null,result:source.result??undefined})!.code;
  const job=await c.query<{id:string}>("INSERT INTO dot_jobs(user_id,source_task_id) VALUES($1,$2) ON CONFLICT(source_task_id) DO NOTHING RETURNING id",[userId,source.id]);
  if(!job.rows.length){await c.query("COMMIT");return null;}
  const goal=`Investigue uma falha registrada (${code}) na tarefa ${source.id}. Examine somente fontes editáveis autorizados. Não repita a operação anterior nem chamadas incertas. Identifique um problema verificável no escopo permitido; proponha uma melhoria pequena, ou registre que não há mudança segura.`;
  const id=await insertEngineeringTask(c,userId,{goal,mode:"develop"});
  await c.query("UPDATE dot_jobs SET engineering_task_id=$2 WHERE id=$1",[job.rows[0].id,id]);
  await c.query("UPDATE dot_settings SET last_paid_at=NOW() WHERE user_id=$1",[userId]);
  await c.query("COMMIT");return id;
 }catch(error){await c.query("ROLLBACK").catch(()=>{});if(error instanceof EngineeringQueueLimit)return null;throw error;}finally{c.release();}
}

/** Called only after trusted OIDC validation in the existing scheduled claim endpoint. */
export async function scheduledDotTick(){
 if(process.env.A3X_DOT_ENABLED==="0")return;
 await db.query("INSERT INTO dot_settings(user_id) SELECT DISTINCT t.user_id FROM engineering_tasks t WHERE NOT EXISTS(SELECT 1 FROM dot_settings s WHERE s.user_id=t.user_id) LIMIT 20 ON CONFLICT DO NOTHING");
 const users=await db.query<{user_id:string}>("SELECT user_id FROM dot_settings WHERE enabled AND (last_scan_at IS NULL OR last_scan_at<=NOW()-INTERVAL '15 minutes') ORDER BY last_scan_at NULLS FIRST LIMIT 20");
 const started=Date.now();for(const user of users.rows){if(Date.now()-started>5000)break;try{await scanDotUser(user.user_id);await queueDotInvestigation(user.user_id);}catch{/* A single user's failure never blocks the manual queue or exposes details. */}}
}

export async function checkDotTask(taskId:string,userId:string,countCall=false,reservation=0){
 const job=await db.query<{enabled:boolean;luna_enabled:boolean;consent_at:Date|null;calls:number;expired:boolean}>("SELECT s.enabled,s.luna_enabled,s.consent_at,j.calls,(j.created_at<NOW()-INTERVAL '1 hour') expired FROM dot_jobs j JOIN dot_settings s ON s.user_id=j.user_id WHERE j.engineering_task_id=$1 AND j.user_id=$2",[taskId,userId]);
 if(!job.rows.length)return;
 const row=job.rows[0];if(process.env.A3X_DOT_ENABLED==="0"||!row.enabled||!row.luna_enabled||!row.consent_at)throw Error("DOT paid execution paused");
 if(row.expired)throw Error("DOT task expired");
 if(countCall){if(!Number.isSafeInteger(reservation)||reservation<0)throw Error("DOT call limit");const changed=await db.query("UPDATE dot_jobs SET calls=calls+1,allocated_micros=allocated_micros+$3 WHERE engineering_task_id=$1 AND user_id=$2 AND calls<5 AND allocated_micros+$3<=30000 RETURNING id",[taskId,userId,reservation]);if(!changed.rows.length)throw Error("DOT call limit");}
}
