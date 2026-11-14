import type {PoolClient} from "pg";
import type {EngineeringMode} from "./engineering-policy";
export class EngineeringQueueLimit extends Error{constructor(){super("Limite de três tarefas por 24h ou duas pendentes.");}}
/** Caller owns the transaction. Shared by manual tasks and the DOT scheduler. */
export async function insertEngineeringTask(c:Pick<PoolClient,"query">,userId:string,task:{goal:string;mode:EngineeringMode}){
 await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,87541))",[userId]);
 const count=await c.query<{n:number;pending:number}>("SELECT COUNT(*) FILTER(WHERE created_at>NOW()-INTERVAL '24 hours')::int n,COUNT(*) FILTER(WHERE status IN ('PENDING','ANALYZING','PLANNING','CODING','TESTING'))::int pending FROM astro_tasks WHERE user_id=$1",[userId]);
 if(count.rows[0].n>=3||count.rows[0].pending>=2)throw new EngineeringQueueLimit();
 const parent=await c.query<{id:string}>("INSERT INTO astro_tasks(user_id,repository,goal) VALUES($1,'luisgussamazon/baixardado',$2) RETURNING id",[userId,task.goal]);
 const id=parent.rows[0].id;
 await c.query("INSERT INTO engineering_tasks(id,user_id,goal,mode) VALUES($1,$2,$3,$4)",[id,userId,task.goal,task.mode]);
 await c.query("INSERT INTO engineering_events(task_id,agent,state,message) VALUES($1,'evolution','waiting','Tarefa registrada. Aguardando runner autenticado.')",[id]);
 return id;
}
