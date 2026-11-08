import OpenAI from "openai";
import { db } from "@/lib/db";
import { PROJECT_LIMITS, projectOutputSchema, validateProject, ProjectValidationError } from "@/lib/project-files";

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
          send("progress",{message:"Planejando a estrutura e gerando os arquivos..."});
          const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:90_000,maxRetries:0});
          const response = await openai.responses.create({
            model:process.env.AI_MODEL || "gpt-5.4-mini",
            instructions:`Você é um desenvolvedor experiente. Gere um projeto pequeno e coerente para o sistema descrito.
              Escreva resumo e README em português brasileiro. Inclua README.md com instalação, execução e limitações.
              Retorne entre 2 e ${PROJECT_LIMITS.files} arquivos de texto com conteúdo completo, não blocos Markdown externos.
              Use caminhos relativos com /, somente letras ASCII, números, _, - e ponto nos segmentos.
              Não use .., caminhos absolutos, .git, arquivos .env ou nomes reservados do Windows. .env.example é permitido com placeholders.
              Máximo ${PROJECT_LIMITS.pathLength} caracteres por caminho, ${PROJECT_LIMITS.depth} níveis, ${PROJECT_LIMITS.fileBytes} bytes por arquivo e ${PROJECT_LIMITS.totalBytes} bytes no total.
              Nome até 80 caracteres e resumo até 2000. Não inclua segredos, binários, dependências vendorizadas ou arquivos de lock extensos.
              Não alegue executar, testar, implantar ou acessar recursos externos. O resultado será apenas exibido como código para revisão.
              Se o pedido for grande, entregue uma versão inicial funcional com escopo reduzido e explique as limitações no README.`,
            input:[{role:"user",content:description}],
            text:{format:{type:"json_schema",name:"programming_project",strict:true,schema:projectOutputSchema}},
            max_output_tokens:PROJECT_LIMITS.outputTokens,
            store:false,stream:true,
          },{signal:abort.signal});
          let raw = "", size = 0, complete = false;
          let lastProgress = Date.now();
          for await (const event of response) {
            if (event.type === "response.output_text.delta") {
              size += encoder.encode(event.delta).byteLength;
              if (size > PROJECT_LIMITS.outputBytes) {
                abort.abort();
                throw new ProjectValidationError("O projeto ultrapassou o tamanho permitido. Descreva um sistema menor.");
              }
              raw += event.delta;
              if (Date.now()-lastProgress > 1500) {
                send("progress",{message:"Gerando o projeto. Os arquivos serão abertos após a validação."});
                lastProgress=Date.now();
              }
            }
            if (event.type === "response.completed") complete=true;
            if (event.type === "response.refusal.delta" || event.type === "response.refusal.done")
              throw new Error("Recusa do provedor.");
            if (event.type === "response.failed" || event.type === "response.incomplete" || event.type === "error")
              throw new Error("Geração não concluída.");
          }
          if (!complete) throw new Error("Geração interrompida.");
          abort.signal.throwIfAborted();
          send("progress",{message:"Validando caminhos, arquivos e tamanhos..."});
          const project = validateProject(JSON.parse(raw));
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
