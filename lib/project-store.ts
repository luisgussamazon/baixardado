import { db } from "@/lib/db";
import { PROJECT_LIMITS, type SavedProject, type ProjectSummary } from "@/lib/project-files";

export class ProjectRequestError extends Error {
  constructor(message:string, public status:number) {super(message);}
}

export async function reserveProject(userId:string, description:string): Promise<string> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // Serializa a reserva por usuário entre processos/réplicas, sem manter conexão durante a IA.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 72631))",[userId]);
    await client.query(`UPDATE programmer_projects SET status='failed',updated_at=NOW()
      WHERE user_id=$1 AND status='generating' AND generation_expires_at<=NOW()`,[userId]);
    const count = await client.query<{total:number;busy:boolean}>(`SELECT COUNT(*)::int AS total,
      COALESCE(BOOL_OR(status='generating'),false) AS busy FROM programmer_projects WHERE user_id=$1`,[userId]);
    if (count.rows[0].busy) throw new ProjectRequestError("Já existe um projeto sendo gerado. Aguarde a conclusão.",409);
    if (count.rows[0].total >= PROJECT_LIMITS.projects) throw new ProjectRequestError("Limite de 100 projetos atingido. Exclua um projeto para continuar.",429);
    const limit = Math.floor(Math.max(1,Math.min(1000,Number(process.env.DAILY_PROJECT_LIMIT || process.env.DAILY_MESSAGE_LIMIT || "50") || 50)));
    const usage = await client.query(`INSERT INTO daily_usage(user_id,day,requests) VALUES($1,CURRENT_DATE,1)
      ON CONFLICT(user_id,day) DO UPDATE SET requests=daily_usage.requests+1
      WHERE daily_usage.requests<$2 RETURNING requests`,[userId,limit]);
    if (!usage.rowCount) throw new ProjectRequestError(`Limite diário de ${limit} projetos atingido. O Chat não tem cota diária de perguntas.`,429);
    const created = await client.query<{id:string}>(`INSERT INTO programmer_projects(user_id,description)
      VALUES($1,$2) RETURNING id`,[userId,description]);
    await client.query("COMMIT");
    return created.rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK").catch(()=>{});
    throw error;
  } finally {client.release();}
}

// O mesmo predicado de propriedade é aplicado em consulta, exclusão, conclusão e ZIP.
export async function getProject(id:string,userId:string): Promise<SavedProject | null> {
  const result = await db.query<SavedProject>(`SELECT id,name,description,summary,files,created_at,
    CASE WHEN status='generating' AND generation_expires_at<=NOW() THEN 'failed' ELSE status END AS status
    FROM programmer_projects WHERE id=$1 AND user_id=$2`,[id,userId]);
  return result.rows[0] ?? null;
}

export async function listProjects(userId:string): Promise<ProjectSummary[]> {
  const result = await db.query<ProjectSummary>(`SELECT id,name,created_at,
    CASE WHEN status='generating' AND generation_expires_at<=NOW() THEN 'failed' ELSE status END AS status
    FROM programmer_projects WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[userId]);
  return result.rows;
}
