import {randomUUID} from "node:crypto";
import type {PoolClient} from "pg";
import {db} from "./db";
import {SOURCE_REPOSITORY} from "./source-policy";

// O executor do Astro é o ciclo confiável da Autonomia A3X (GitHub Actions, sem rede na
// validação). O runner é efêmero: um lease expirado falha a tarefa e libera a fila, pois
// não resta workspace persistente para reconciliar. Validação e publicação levam até ~35 min.
export const ASTRO_LEASE_MINUTES=60;
export type AstroTask={id:string;user_id:string;goal:string;lease_token:string};
type Stage="PLANNING"|"CODING"|"VALIDATING";
type Terminal="COMPLETED"|"FAILED"|"CANCELLED";
const TERMINAL="('COMPLETED','FAILED','ROLLED_BACK','CANCELLED')";

async function expireAstroLeases(client:PoolClient){
  await client.query(`WITH expired AS (
      UPDATE astro_tasks SET status='FAILED',lease_token=NULL,lease_until=NULL,updated_at=NOW()
      WHERE lease_until<NOW() AND status NOT IN ${TERMINAL} RETURNING id
    ) INSERT INTO astro_events(task_id,status,summary)
      SELECT id,'FAILED','O ciclo não concluiu no prazo. Nenhuma alteração foi publicada por esta tarefa.' FROM expired`);
  await client.query(`UPDATE astro_tasks SET lease_token=NULL,lease_until=NULL
    WHERE lease_token IS NOT NULL AND status IN ${TERMINAL}`);
}

// Deve ser chamada dentro da transação do ciclo. Só assume tarefas cujo autor ainda
// mantém o consentimento da Luna, que paga o consumo da API.
export async function claimAstroTask(client:PoolClient):Promise<AstroTask|null>{
  await client.query("SELECT pg_advisory_xact_lock(87540)");
  await expireAstroLeases(client);
  const task=await client.query<AstroTask>(`UPDATE astro_tasks SET status='ANALYZING',
      lease_token=$1,lease_until=NOW()+$3::int*INTERVAL '1 minute',attempts=attempts+1,updated_at=NOW()
    WHERE id=(SELECT t.id FROM astro_tasks t
      JOIN ai_preferences p ON p.user_id=t.user_id AND p.provider='openai'
        AND p.cloud_consent_version=1 AND p.cloud_consented_at IS NOT NULL
      WHERE t.status='PENDING' AND NOT t.cancel_requested AND t.attempts<3 AND t.repository=$2
        AND NOT EXISTS(SELECT 1 FROM astro_tasks WHERE repository=$2 AND lease_token IS NOT NULL)
      ORDER BY t.created_at,t.id LIMIT 1 FOR UPDATE OF t SKIP LOCKED)
    RETURNING id,user_id,goal,lease_token`,[randomUUID(),SOURCE_REPOSITORY,ASTRO_LEASE_MINUTES]);
  if(task.rows[0])await client.query(
    "INSERT INTO astro_events(task_id,status,summary) VALUES($1,'ANALYZING','Ciclo de autonomia assumiu a tarefa.')",
    [task.rows[0].id]);
  return task.rows[0]??null;
}

export async function linkAstroCycle(client:PoolClient,task:AstroTask,cycleId:string){
  await client.query("UPDATE astro_tasks SET cycle_id=$3 WHERE id=$1 AND lease_token=$2",[task.id,task.lease_token,cycleId]);
}

// Avança de etapa respeitando a interrupção pedida pelo usuário. Retorna false se a
// tarefa foi cancelada ou perdeu o lease; o ciclo deve parar sem publicar.
export async function advanceAstroTask(task:AstroTask,status:Stage,summary:string){
  const result=await db.query<{status:string}>(`WITH changed AS (
      UPDATE astro_tasks SET status=CASE WHEN cancel_requested THEN 'CANCELLED' ELSE $3::text END,
        lease_token=CASE WHEN cancel_requested THEN NULL ELSE lease_token END,
        lease_until=CASE WHEN cancel_requested THEN NULL ELSE lease_until END,updated_at=NOW()
      WHERE id=$1 AND lease_token=$2 AND lease_until>NOW() RETURNING id,status
    ) INSERT INTO astro_events(task_id,status,summary)
      SELECT id,status,CASE WHEN status='CANCELLED' THEN 'Tarefa interrompida pelo usuário.' ELSE $4::text END FROM changed
      RETURNING status`,[task.id,task.lease_token,status,summary.slice(0,2000)]);
  return result.rows[0]?.status===status;
}

export async function finishAstroTask(task:AstroTask,status:Terminal,summary:string){
  await db.query(`WITH changed AS (
      UPDATE astro_tasks SET status=$3,lease_token=NULL,lease_until=NULL,updated_at=NOW()
      WHERE id=$1 AND lease_token=$2 RETURNING id
    ) INSERT INTO astro_events(task_id,status,summary) SELECT id,$3,$4 FROM changed`,
  [task.id,task.lease_token,status,summary.slice(0,2000)]);
}

// Resultado informado pelo workflow ao concluir o ciclo vinculado.
export async function finishAstroCycle(cycleId:string,outcome:"deployed"|"failed"){
  await db.query(`WITH changed AS (
      UPDATE astro_tasks SET status=CASE WHEN $2='deployed' THEN 'COMPLETED'
          WHEN cancel_requested THEN 'CANCELLED' ELSE 'FAILED' END,
        lease_token=NULL,lease_until=NULL,updated_at=NOW()
      WHERE cycle_id=$1 AND lease_token IS NOT NULL RETURNING id,status
    ) INSERT INTO astro_events(task_id,status,summary) SELECT id,status,CASE status
        WHEN 'COMPLETED' THEN 'Alteração validada, publicada no main e implantada.'
        WHEN 'CANCELLED' THEN 'Tarefa interrompida antes da publicação.'
        ELSE 'Validação, publicação ou implantação não foi concluída. Veja o ciclo em Autonomia A3X.' END
      FROM changed`,[cycleId,outcome]);
}

// Chamada ao autorizar a publicação. A atualização da linha serializa com o PATCH de
// cancelamento: ou a tarefa entra em APPLYING (sem volta), ou a publicação é recusada.
export async function markAstroApplying(cycleId:string):Promise<"none"|"applying"|"cancelled">{
  const result=await db.query<{id:string;cancel_requested:boolean}>(`UPDATE astro_tasks SET
      status=CASE WHEN cancel_requested THEN status ELSE 'APPLYING' END,updated_at=NOW()
    WHERE cycle_id=$1 AND lease_token IS NOT NULL AND status IN ('VALIDATING','APPLYING')
    RETURNING id,cancel_requested`,[cycleId]);
  const task=result.rows[0];
  if(!task)return "none";
  if(task.cancel_requested)return "cancelled";
  await db.query("INSERT INTO astro_events(task_id,status,summary) VALUES($1,'APPLYING','Validação aprovada. Publicando no main e aguardando implantação.')",[task.id]);
  return "applying";
}

export async function astroCycleCancelled(cycleId:string){
  const result=await db.query("SELECT 1 FROM astro_tasks WHERE cycle_id=$1 AND cancel_requested",[cycleId]);
  return result.rows.length>0;
}
