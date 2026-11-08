import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, isUuid } from "@/lib/http";
import { getUser, validOrigin } from "@/lib/security";
import { getProject } from "@/lib/project-store";
import { validateProject } from "@/lib/project-files";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = {params:Promise<{id:string}>};

export async function GET(_req:Request,{params}:Context) {
  try {
    const user=await getUser();
    if (!user) return apiError("Faça login.",401);
    const {id}=await params;
    if (!isUuid(id)) return apiError("Identificador inválido.");
    const project=await getProject(id,user.id);
    if (!project) return apiError("Projeto não encontrado.",404);
    if (project.status === "ready") validateProject(project);
    return NextResponse.json({project},{headers:{"Cache-Control":"private, no-store"}});
  } catch {return apiError("Não foi possível carregar o projeto.",503);}
}

export async function DELETE(req:Request,{params}:Context) {
  try {
    if (!validOrigin(req)) return apiError("Solicitação não autorizada.",403);
    const user=await getUser();
    if (!user) return apiError("Faça login.",401);
    const {id}=await params;
    if (!isUuid(id)) return apiError("Identificador inválido.");
    const removed=await db.query(`DELETE FROM programmer_projects WHERE id=$1 AND user_id=$2
      AND (status<>'generating' OR generation_expires_at<=NOW()) RETURNING id`,[id,user.id]);
    if (!removed.rowCount) return apiError("Projeto indisponível ou geração em andamento.",409);
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  } catch {return apiError("Não foi possível excluir o projeto.",503);}
}
