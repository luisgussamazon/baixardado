import {DOT_AGENTS,dotPersona,type DotAgent} from "@/lib/dot-policy";
import { searchMany, researchMarkdown } from "@/lib/web-search";
import { db } from "@/lib/db";
import { apiError, isJson, isUuid, parseJson } from "@/lib/http";
import { getUser, validOrigin } from "@/lib/security";
import type { ConversationTurn } from "@/lib/local-conversation";
import { shouldLookupPersonalKnowledge } from "@/lib/dialogue-knowledge";
import { searchKnowledge, knowledgeMarkdown } from "@/lib/knowledge-search";
import { decide } from "@/lib/cognitive/engine";
import { loadCognitiveContext, persistDialogueReply } from "@/lib/cognitive/store";
import { connectedModelReply,modelMessages } from "@/lib/local-model";
import { studyReferences } from "@/lib/autonomous-study";
import {selectedProvider,CloudAIError} from "@/lib/ai-provider";
import {openAILunaReply} from "@/lib/openai-luna";
import {browserContext} from "@/lib/browser-device";
import {browserNavigationRequest} from "@/lib/browser-policy";
import {assistantPresentation} from "@/lib/answer-presentation";
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
    if(body.dotAgent!==undefined&&!DOT_AGENTS.includes(body.dotAgent as DotAgent))return apiError("Personagem DOT invalido.");
    const id = body.conversationId;
    const message = body.message.trim();
    const provider=await selectedProvider(user.id);
    if(body.shareKnowledgeWithCloud!==undefined&&typeof body.shareKnowledgeWithCloud!=="boolean")return apiError("Consentimento para consultar documentos inválido.");
    if(body.shareComputerDocuments!==undefined&&typeof body.shareComputerDocuments!=="boolean")return apiError("Consentimento para consultar o computador inválido.");
    if(body.browserDeviceId!==undefined&&(typeof body.browserDeviceId!=="string"||!isUuid(body.browserDeviceId)||body.shareBrowserContext!==true))return apiError("Confirme o compartilhamento da tela selecionada.");
    if(body.browserDeviceId&&provider==="openai"&&body.shareBrowserContextWithCloud!==true)return apiError("Confirme o envio da captura à OpenAI para esta pergunta.");
    const pageContext=typeof body.browserDeviceId==="string"?await browserContext(user.id,body.browserDeviceId):null;
    if(body.browserDeviceId&&!pageContext)return apiError("Tela expirada ou indisponível. Compartilhe uma nova captura pela extensão.",404);
    const browserNavigation=pageContext?browserNavigationRequest(message):null;
    const locked = await db.query<{busy_until: string}>(`UPDATE conversations SET busy_until=NOW()+INTERVAL '5 minutes'
      WHERE id=$1 AND user_id=$2 AND (busy_until IS NULL OR busy_until<NOW()) RETURNING busy_until::text`, [id,user.id]);
    if (!locked.rowCount) return apiError("Conversa inexistente ou resposta anterior ainda em andamento.", 409);

    let handedOff = false;
    const lease = locked.rows[0].busy_until;
    const unlock = () => db.query("UPDATE conversations SET busy_until=NULL WHERE id=$1 AND user_id=$2 AND busy_until=$3", [id,user.id,lease]);
    try {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
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
              if(browserNavigation){
                full="Posso solicitar a abertura de "+browserNavigation.label+" na aba do ICQA vinculada. Confirme no botão abaixo; depois revise e compartilhe a nova tela pela extensão.";
                await persistDialogueReply(user.id,id,cognitive.state,full);
                send("delta",{text:full});send("browser_action",{deviceId:body.browserDeviceId,...browserNavigation});send("done",{ok:true,provider:"rules"});return;
              }
              const research = decision.kind==="search" ? await searchMany(decision.query,abort.signal) : null;
              abort.signal.throwIfAborted();
              let unavailable=false;
              const hits=decision.kind==="reply"&&!cognitive.protected&&(provider==="openai"||decision.knowledgeQuery||shouldLookupPersonalKnowledge(message))?
                await searchKnowledge(decision.knowledgeQuery??message,user.id,3,provider!=="openai"||body.shareKnowledgeWithCloud===true).catch(()=>{unavailable=true;return [];}):[];
              const relevantHits=decision.kind==="reply"&&!decision.knowledgeQuery&&provider!=="openai"?hits.filter(hit=>hit.scope==="private"):hits;
              full = decision.kind==="reply" ? (relevantHits.length?knowledgeMarkdown(relevantHits):
                (unavailable?"A base local está temporariamente indisponível.\n\n":"")+decision.text) : researchMarkdown(research!);
              let generated:string|null=null;
              const studies=!cognitive.protected&&!research?await studyReferences(message).catch(()=>[]):[];
              if((!cognitive.protected||decision.kind==="search")&&(!research||research.results.length>0)){
                let computerDocument:ReturnType<typeof assistantPresentation>|undefined;
                if(provider==="openai"&&body.shareComputerDocuments===true&&!research){
                  const document=await connectedModelReply(user.id,id,[
                    {role:"system",content:"Consulta exclusiva à documentação privada. Se nenhum trecho documental estiver disponível, responda apenas SEM_TRECHOS."},
                    {role:"user",content:message},
                  ],AbortSignal.any([abort.signal,AbortSignal.timeout(35_000)])).catch(()=>null);
                  if(document){
                    const result=assistantPresentation(document);
                    if(/^- \[L\d+\]/.test(result.sources))computerDocument=result;
                  }
                }
                abort.signal.throwIfAborted();
                const documentContext=computerDocument&&computerDocument.sources.slice(0,250)+"\n"+computerDocument.text.slice(0,850);
                const messages=modelMessages(message,dialogueHistory,context.records,hits,research,studies,provider,pageContext,documentContext,body.dotAgent?dotPersona(body.dotAgent as DotAgent):undefined);
                generated=provider==="openai"?await openAILunaReply(user.id,messages,abort.signal):await connectedModelReply(user.id,id,messages,abort.signal).catch(()=>null);
                if(generated&&body.shareComputerDocuments===true&&provider==="openai"&&!research){
                  generated+=computerDocument?"\n\n**Fontes:**\n"+computerDocument.sources.slice(0,250)+"\n- **Trechos privados fornecidos ao modelo:** documentos do computador, autorizados para esta pergunta.":"\n\n_Nenhum trecho do computador foi recuperado para esta pergunta. Verifique se a ponte está conectada._";
                }
              }
              abort.signal.throwIfAborted();
              if(generated){
                full=generated;
                if(pageContext)full+="\n\n**Fontes:**\n- [P1: tela compartilhada pelo usuário]("+pageContext.url+")";
                if(research?.results.length)full+="\n\n**Fontes:**\n"+research.results.slice(0,6).map((item,i)=>`- [W${i+1}: ${new URL(item.url).hostname}](${item.url})`).join("\n");
                if(hits.length)full+="\n\n**Fontes:**\n- "+hits.slice(0,2).map((item,i)=>`[K${i+1}] ${item.id}`).join(" · ");
                if(studies.length)full+="\n\n**Fontes:**\n"+studies.map(note=>`- ${note.title} · ${note.collected_at.slice(0,10)}\n`+note.sources.slice(0,2).map(source=>`  - [${new URL(source.url).hostname}](${source.url})`).join("\n")).join("\n");
              }
              if((generated?hits.slice(0,2):relevantHits).some(hit=>hit.scope==="private")){
                full+="\n\n**Fontes:**\n- **Trechos privados fornecidos ao modelo:** conteúdo da base desta conta.";
              }
              await persistDialogueReply(user.id,id,cognitive.state,full);
              send("delta",{text:full});
              send("done",{ok:true,provider:generated?provider:"rules"});
            } catch (error) {
              console.error("Falha ao responder à conversa.");
              send("failure",{message:error instanceof CloudAIError?error.message:"Não foi possível concluir a resposta. Sua pergunta ficou salva; tente novamente."});
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
      // Se falhar antes de transmitir, libere o bloqueio.
      if (!handedOff) {
        try {await unlock();}
        catch (unlockError) {console.error("Falha ao liberar conversa");}
      }
    }
  } catch {
    return apiError("Serviço temporariamente indisponível. Tente novamente.", 503);
  }
}
