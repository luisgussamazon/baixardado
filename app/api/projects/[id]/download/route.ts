import { apiError, isUuid } from "@/lib/http";
import { getUser } from "@/lib/security";
import { getProject } from "@/lib/project-store";
import { projectZip } from "@/lib/project-zip";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await getUser();
    if (!user) return apiError("Faça login.",401);
    const {id}=await params;
    if (!isUuid(id)) return apiError("Identificador inválido.");
    const project=await getProject(id,user.id);
    if (!project) return apiError("Projeto não encontrado.",404);
    if (project.status !== "ready") return apiError("O projeto ainda não está pronto para download.",409);
    const zip=projectZip(project);
    return new Response(new Uint8Array(zip),{headers:{
      "Content-Type":"application/zip",
      "Content-Disposition":`attachment; filename="a3x-projeto-${id}.zip"`,
      "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
    }});
  } catch {return apiError("Não foi possível preparar o ZIP. Os arquivos precisam ser válidos.",503);}
}
