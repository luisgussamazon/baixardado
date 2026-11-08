import { searchWeb } from "@/lib/web-search";
import { researchProject } from "@/lib/research-project";
import { db } from "@/lib/db";
import { ProjectValidationError } from "@/lib/project-files";
import { searchKnowledge,knowledgeMarkdown } from "@/lib/knowledge-search";

export function generateProjectStream(req:Request, id:string, userId:string, description:string): ReadableStream<Uint8Array> {
  const abort = new AbortController();
  const encoder = new TextEncoder();
  let cancelled = false;
  const onAbort = () => abort.abort();
  req.signal.addEventListener("abort",onAbort,{once:true});
  if (req.signal.aborted) abort.abort();
  const timeout = setTimeout(()=>abort.abort(),120_000);

  return new ReadableStream<Uint8Array>({
    cancel() {cancelled=true;abort.abort();},
    start(controller) {
      const send = (event:string,data:unknown) => {
        if (!cancelled) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      void (async()=>{
        try {
          send("started",{id});
          send("progress",{message:"Pesquisando fontes e preparando uma base de arquivos..."});
          const research = await searchWeb(description,abort.signal);
          abort.signal.throwIfAborted();
          const hits=await searchKnowledge(description,userId,1).catch(()=>[]);
          const project = researchProject(description,research,hits.length?knowledgeMarkdown(hits):undefined);
          const saved = await db.query(`UPDATE programmer_projects SET name=$3,summary=$4,files=$5::jsonb,
            status='ready',updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status='generating'
            AND generation_expires_at>NOW() RETURNING id`,[id,userId,project.name,project.summary,JSON.stringify(project.files)]);
          if (!saved.rowCount) throw new Error("Reserva expirada.");
          send("done",{id});
        } catch (error) {
          abort.abort();
          try {
            await db.query(`UPDATE programmer_projects SET status='failed',updated_at=NOW()
              WHERE id=$1 AND user_id=$2 AND status='generating'`,[id,userId]);
          } catch {console.error("Falha ao registrar interrupção do projeto.");}
          send("failure",{message:error instanceof ProjectValidationError ? error.message :
            "Não foi possível concluir o projeto. A tentativa pode ter consumido a cota. Revise o histórico antes de tentar novamente."});
        } finally {
          clearTimeout(timeout);
          req.signal.removeEventListener("abort",onAbort);
          if (!cancelled) controller.close();
        }
      })();
    },
  });
}
