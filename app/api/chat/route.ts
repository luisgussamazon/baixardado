import { searchMany, researchMarkdown } from "@/lib/web-search";
import { db } from "@/lib/db";
import { apiError, isJson, isUuid, parseJson } from "@/lib/http";
import { getUser, validOrigin } from "@/lib/security";
import type { ConversationTurn } from "@/lib/local-conversation";
import { shouldLookupPersonalKnowledge } from "@/lib/dialogue-knowledge";
import { searchKnowledge, knowledgeMarkdown } from "@/lib/knowledge-search";
import { decide, confidenceNote } from "@/lib/cognitive/engine";
import { loadCognitiveContext, persistDialogueReply } from "@/lib/cognitive/store";
import { connectedModelReply,modelMessages } from "@/lib/local-model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!validOrigin(req) || !isJson(req)) return apiError("Solicitação não autorizada.", 403);
    const user = await getUser();
    if (!user) return apiError("Faça login.", 401);
    const body = await parseJson(req);
    if (!body || typeof body.conversationId !== "string" || !isUuid(body.conversationId) ||
        typeof body.message !== "string" || !body.message.trim() || body.message.length > 4_000)
      return apiError("Mensagem inválida ou acima do limite de 4.000 caracteres.");
    const id = body.conversationId;
    const message = body.message.trim();
    const locked = await db.query<{busy_until: string}>(`UPDATE conversations SET busy_until=NOW()+INTERVAL '5 minutes'
      WHERE id=$1 AND user_id=$2 AND (busy_until IS NULL OR busy_until<NOW()) RETURNING busy_until::text`, [id,user.id]);
    if (!locked.rowCount) return apiError("Conversa inexistente ou resposta anterior ainda em andamento.", 409);

    let handedOff = false;
    const lease = locked.rows[0].busy_until;
    const unlock = () => db.query("UPDATE conversations SET busy_until=NULL WHERE id=$1 AND user_id=$2 AND busy_until=$3", [id,user.id,lease]);
    try {
      const limit = Math.floor(Math.max(1, Math.min(1000, Number(process.env.DAILY_MESSAGE_LIMIT || "50") || 50)));
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const usage = await client.query<{requests: number}>(`INSERT INTO daily_usage(user_id,day,requests)
          VALUES($1,CURRENT_DATE,1)
          ON CONFLICT(user_id,day) DO UPDATE SET requests=daily_usage.requests+1
          WHERE daily_usage.requests < $2 RETURNING requests`, [user.id, limit]);
        if (!usage.rowCount) {
          await client.query("ROLLBACK");
          return apiError(`Limite diário de ${limit} mensagens atingido.`,429);
        }
        await client.query("INSERT INTO messages(conversation_id,role,content) VALUES($1,'user',$2)",[id,message]);
        await client.query(`UPDATE conversations SET title=CASE WHEN title='Nova conversa'
          THEN $2 ELSE title END,updated_at=NOW() WHERE id=$1 AND user_id=$3`,[id,message.slice(0,60),user.id]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally { client.release(); }
      const history=await db.query<ConversationTurn>(`SELECT role,content FROM (
        SELECT m.id,m.role,m.content FROM messages m JOIN conversations c ON c.id=m.conversation_id
        WHERE c.id=$1 AND c.user_id=$2 ORDER BY m.id DESC LIMIT 25
      ) recent ORDER BY id ASC`,[id,user.id]);
      // A pergunta atual já está salva e é passada separadamente ao motor.
      const dialogueHistory=history.rows.slice(0,-1);
      const context=await loadCognitiveContext(user.id,id);
      const cognitive=decide(message,dialogueHistory,context.state,context.records);
      const decision=cognitive.route==="web"?{kind:"search" as const,query:cognitive.query!}:
        {kind:"reply" as const,text:cognitive.text,knowledgeQuery:cognitive.route==="unknown"?cognitive.query:undefined};
      const encoder = new TextEncoder();
      const abort = new AbortController();
      let cancelled = false;
      const onAbort = () => { cancelled = true; abort.abort(); };
      req.signal.addEventListener("abort", onAbort, {once:true});
      if (req.signal.aborted) onAbort();
      // Limite total, inclusive quando o provedor mantém a conexão aberta sem concluir.
      const timeout = setTimeout(() => abort.abort(), 120_000);
      const stream = new ReadableStream<Uint8Array>({
        cancel() { onAbort(); },
        start(controller) {
          void (async () => {
            const send = (event: string, data: unknown) => {
              if (cancelled) return;
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };
            const heartbeat=setInterval(()=>{try{send("heartbeat",{});}catch{/* Transporte encerrado. */}},15000);
            let full = "";
            try {
              const research = decision.kind==="search" ? await searchMany(decision.query,abort.signal) : null;
              abort.signal.throwIfAborted();
              let unavailable=false;
              const hits=decision.kind==="reply"&&!cognitive.protected&&(decision.knowledgeQuery||shouldLookupPersonalKnowledge(message))?
                await searchKnowledge(decision.knowledgeQuery??message,user.id).catch(()=>{unavailable=true;return [];}):[];
              const relevantHits=decision.kind==="reply"&&!decision.knowledgeQuery?hits.filter(hit=>hit.scope==="private"):hits;
              full = decision.kind==="reply" ? (relevantHits.length?knowledgeMarkdown(relevantHits):
                (unavailable?"A base local está temporariamente indisponível.\n\n":"")+decision.text) : researchMarkdown(research!);
              let generated:string|null=null,modelFailed=false;
              if((!cognitive.protected||decision.kind==="search")&&(!research||research.results.length>0)){
                generated=await connectedModelReply(user.id,id,modelMessages(message,dialogueHistory,context.records,hits,research),abort.signal).catch(()=>{modelFailed=true;return null;});
              }
              abort.signal.throwIfAborted();
              if(generated){
                full=generated+"\n\n_Gerado pelo modelo aberto Qwen3 4B no seu computador. Pode conter erros; confira informações importantes._";
                if(research?.results.length)full+="\n\n**Fontes recuperadas (trechos de busca, sem leitura integral das páginas):**\n"+research.results.slice(0,6).map((item,i)=>`- [W${i+1}: ${new URL(item.url).hostname}](${item.url})`).join("\n");
                if(hits.length)full+="\n\n**Conhecimento fornecido ao modelo:** "+hits.slice(0,2).map((item,i)=>`[K${i+1}] ${item.id}`).join(" · ");
              }else if(modelFailed)full="Não consegui usar o modelo do seu computador nesta tentativa. Segue a resposta disponível pelo motor local:\n\n"+full;
              const confidence=relevantHits.length?"moderada":cognitive.confidence;
              const reason=relevantHits.length?"recuperação textual; confira a fonte":cognitive.reason;
              if(!generated)full+=confidenceNote(confidence,reason);
              await persistDialogueReply(user.id,id,cognitive.state,full);
              send("delta",{text:full});
              send("done",{ok:true});
            } catch (error) {
              console.error("Falha ao responder à conversa.");
              send("failure",{message:"Não foi possível concluir a resposta. Sua pergunta ficou salva; tente novamente."});
            } finally {
              clearInterval(heartbeat);
              clearTimeout(timeout);
              req.signal.removeEventListener("abort", onAbort);
              try {await unlock();}
              catch (error) {console.error("Falha ao liberar conversa:");}
              if (!cancelled) controller.close();
            }
          })();
        }
      });
      handedOff = true;
      return new Response(stream, {
        headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"private, no-store, no-transform","X-Accel-Buffering":"no"},
      });
    } catch (error) {
      console.error("Erro ao iniciar a resposta:");
      return apiError("Erro no processamento da mensagem.",500);
    } finally {
      // Se falhar antes de transmitir (incluindo limite diário), libere o bloqueio.
      if (!handedOff) {
        try {await unlock();}
        catch (unlockError) {console.error("Falha ao liberar conversa");}
      }
    }
  } catch {
    return apiError("Serviço temporariamente indisponível. Tente novamente.", 503);
  }
}
