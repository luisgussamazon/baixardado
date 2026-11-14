import {db} from "@/lib/db";

const endpoint="https://api.github.com/repos/luisgussamazon/baixardado/actions/workflows/a3x-engineering.yml/dispatches";
export const ENGINEERING_WORKFLOW_URL="https://github.com/luisgussamazon/baixardado/actions/workflows/a3x-engineering.yml";
export function immediateEngineeringConfigured(){return Boolean(process.env.A3X_GITHUB_ACTIONS_TOKEN?.trim());}
export type DispatchState="requested"|"unconfigured"|"unavailable"|"cooldown"|"not-queued";

/** Requests the trusted workflow only; no goal, code, account data or caller-selected URL/ref is sent. */
export async function dispatchEngineering(id:string,userId:string):Promise<DispatchState>{
 const c=await db.connect();
 let token:string|undefined;
 try{
  await c.query("BEGIN");
  const task=await c.query<{status:string}>("SELECT status FROM engineering_tasks WHERE id=$1 AND user_id=$2 FOR UPDATE",[id,userId]);
  if(task.rows[0]?.status!=="queued"){await c.query("ROLLBACK");return "not-queued";}
  token=process.env.A3X_GITHUB_ACTIONS_TOKEN?.trim();
  if(!token){await c.query("ROLLBACK");return "unconfigured";}
  const recent=await c.query("SELECT 1 FROM engineering_events WHERE task_id=$1 AND message='Acionamento imediato solicitado.' AND created_at>NOW()-INTERVAL '60 seconds' LIMIT 1",[id]);
  if(recent.rows.length){await c.query("ROLLBACK");return "cooldown";}
  await c.query("INSERT INTO engineering_events(task_id,agent,state,message) VALUES($1,'evolution','waiting','Acionamento imediato solicitado.')",[id]);
  await c.query("COMMIT");
 }catch{await c.query("ROLLBACK").catch(()=>{});return "unavailable";}finally{c.release();}
 try{
  const response=await fetch(endpoint,{method:"POST",headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"Content-Type":"application/json","X-GitHub-Api-Version":"2026-03-10"},body:JSON.stringify({ref:"main"}),redirect:"error",signal:AbortSignal.timeout(8000),cache:"no-store"});
  // Both current 200 and legacy 204 are valid dispatch acknowledgments. Never retry an uncertain POST.
  if(response.status!==200&&response.status!==204)return "unavailable";
  return "requested";
 }catch{return "unavailable";}
}
