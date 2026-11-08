import OpenAI from "openai";
import { db } from "@/lib/db";
import { apiError, isJson, isUuid, parseJson } from "@/lib/http";
import { getUser, validOrigin } from "@/lib/security";
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
    if (!process.env.OPENAI_API_KEY) return apiError("Chave da OpenAI não configurada no servidor.", 503);
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
      const history = await db.query<{role:"user"|"assistant";content:string}>(`SELECT role,content
        FROM (SELECT id,role,content FROM messages WHERE conversation_id=$1 ORDER BY id DESC LIMIT 24) h
        ORDER BY id ASC`,[id]);

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
            let full = "";
            let complete = false;
            try {
              const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY, timeout:90_000, maxRetries:0});
              const response = await openai.responses.create({
                model: process.env.AI_MODEL || "gpt-5.4-mini",
                instructions: "Você é um assistente prestativo, claro e seguro. Converse em português brasileiro, salvo solicitação em contrário. Não alegue ter acessado informações externas quando não tiver acesso. Respeite a privacidade do usuário.",
                input: history.rows.map(item => ({role:item.role,content:item.content})),
                max_output_tokens: 1600,
                stream: true,
                store: false,
              }, {signal:abort.signal});
              for await (const chunk of response) {
                if (chunk.type === "response.output_text.delta") {
                  full += chunk.delta;
                  send("delta", {text: chunk.delta});
                }
                if (chunk.type === "response.completed") complete = true;
                if (chunk.type === "response.refusal.delta") {
                  full += chunk.delta;
                  send("delta", {text:chunk.delta});
                }
                if (chunk.type === "response.failed" || chunk.type === "response.incomplete" || chunk.type === "error")
                  throw new Error("Resposta não concluída pelo provedor.");
              }
              if (!complete || !full.trim()) throw new Error("Resposta interrompida ou vazia.");
              await db.query("INSERT INTO messages(conversation_id,role,content) VALUES($1,'assistant',$2)",[id,full]);
              await db.query("UPDATE conversations SET updated_at=NOW() WHERE id=$1 AND user_id=$2",[id,user.id]);
              send("done",{ok:true});
            } catch (error) {
              console.error("Erro durante resposta da IA:");
              send("failure",{message:"Não foi possível concluir a resposta. Sua pergunta ficou salva; tente novamente."});
            } finally {
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
