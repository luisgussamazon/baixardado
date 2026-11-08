import { NextResponse } from "next/server";
import { apiError, isJson, parseJson } from "@/lib/http";
import { getUser, validOrigin } from "@/lib/security";
import { PROJECT_LIMITS } from "@/lib/project-files";
import { listProjects, reserveProject, ProjectRequestError } from "@/lib/project-store";
import { generateProjectStream } from "@/lib/project-generation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user=await getUser();
    if (!user) return apiError("Faça login.",401);
    return NextResponse.json({projects:await listProjects(user.id)},{headers:{"Cache-Control":"private, no-store"}});
  } catch {return apiError("Não foi possível carregar os projetos.",503);}
}

export async function POST(req:Request) {
  try {
    if (!validOrigin(req) || !isJson(req)) return apiError("Solicitação não autorizada.",403);
    const user=await getUser();
    if (!user) return apiError("Faça login.",401);
    const data=await parseJson(req);
    if (!data || typeof data.description !== "string" || !data.description.trim() || data.description.includes("\0") || data.description.length > PROJECT_LIMITS.description)
      return apiError("Descreva o sistema em até 4.000 caracteres.");
    if (req.signal.aborted) return apiError("Solicitação cancelada.",400);
    const description=data.description.trim();
    const id=await reserveProject(user.id,description);
    return new Response(generateProjectStream(req,id,user.id,description),{headers:{
      "Content-Type":"text/event-stream; charset=utf-8",
      "Cache-Control":"private, no-store, no-transform","X-Accel-Buffering":"no",
    }});
  } catch (error) {
    if (error instanceof ProjectRequestError) return apiError(error.message,error.status);
    return apiError("Não foi possível iniciar o projeto. Tente novamente mais tarde.",503);
  }
}
