import {validateInference} from "./local-inference";
import type {ModelMessage} from "./local-model";
import {OPENAI_MODEL,openAIConfigured,CloudAIError,reserveAIUsage,finishAIUsage} from "./ai-provider";
export async function openAILunaReply(userId:string,messages:ModelMessage[],signal:AbortSignal,purpose?:"source",beforeReserve?:(reservation:number)=>Promise<unknown>):Promise<string>{
  if(!openAIConfigured())throw new CloudAIError("GPT-6 Luna não está configurado no servidor.");
  const valid=purpose==="source"?Array.isArray(messages)&&messages.length===2&&messages.every(m=>m&&["system","user"].includes(m.role)&&typeof m.content==="string")&&messages.reduce((n,m)=>n+m.content.length,0)<=40000:validateInference({messages});
  if(!valid)throw new CloudAIError("Contexto acima do limite permitido.",400);
  signal.throwIfAborted();
  const maxOutput=purpose==="source"?4000:600;
  // Um token de entrada ocupa pelo menos um byte. Acrescenta folga para estrutura e papéis.
  const reserved=Math.ceil((Buffer.byteLength(JSON.stringify(messages))+4096)*.1+maxOutput*.5);
  await beforeReserve?.(reserved);
  const id=await reserveAIUsage(userId,reserved);let settled=false,requested=false;
  try{
    signal.throwIfAborted();
    requested=true;
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+process.env.OPENAI_API_KEY!.trim()},
      body:JSON.stringify({model:OPENAI_MODEL,input:messages,reasoning:{effort:"none"},max_output_tokens:maxOutput,service_tier:"default",store:false,stream:false,...(purpose==="source"?{text:{format:{type:"json_object"}}}:{})}),
      signal:AbortSignal.any([signal,AbortSignal.timeout(90000)]),
    });
    if(!response.ok){
      await response.body?.cancel();
      // Não há retry automático: uma chamada pode ter sido processada pelo provedor.
      if(response.status>=400&&response.status<500){await finishAIUsage(id,"rejected");settled=true;}
      if(response.status===401)throw new CloudAIError("A chave da OpenAI foi recusada. Confira a configuração no Railway.",502);
      if(response.status===403||response.status===404)throw new CloudAIError("A conta da OpenAI não tem acesso ao GPT-6 Luna.",502);
      if(response.status===429)throw new CloudAIError("A OpenAI recusou por limite ou saldo. Confira créditos e limites da conta.",429);
      throw new CloudAIError("A OpenAI está temporariamente indisponível.");
    }
    if(!response.body)throw new CloudAIError("A OpenAI retornou uma resposta vazia.");
    const reader=response.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let text="",size=0;
    try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>128000)throw new CloudAIError("Resposta da API acima do limite.");text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel();}
    const result=JSON.parse(text);
    const input=result.usage?.input_tokens,output=result.usage?.output_tokens;
    if(Number.isSafeInteger(input)&&input>=0&&input<=200000&&Number.isSafeInteger(output)&&output>=0&&output<=maxOutput){
      await finishAIUsage(id,"succeeded",{input,output});settled=true;
    }
    if(result.status!=="completed")throw new CloudAIError("A resposta não foi concluída. Tente uma pergunta mais específica.",502);
    if(!Array.isArray(result.output))throw new CloudAIError("Resposta inválida da OpenAI.",502);
    const answer=result.output.filter((item:{type?:string;role?:string})=>item.type==="message"&&item.role==="assistant")
      .flatMap((item:{content?:unknown[]})=>Array.isArray(item.content)?item.content:[])
      .flatMap((value:unknown)=>{const part=value as {type?:string;text?:unknown;refusal?:unknown};return part?.type==="output_text"&&typeof part.text==="string"?[part.text]:part?.type==="refusal"&&typeof part.refusal==="string"?[part.refusal]:[];}).join("\n").trim();
    if(!answer||answer.length>(purpose==="source"?30000:12000))throw new CloudAIError("Resposta inválida da OpenAI.",502);
    if(!settled){await finishAIUsage(id,"unknown");settled=true;}
    return answer;
  }catch(error){
    if(!settled)await finishAIUsage(id,requested?"unknown":"rejected").catch(()=>{});
    if(error instanceof CloudAIError)throw error;
    throw new CloudAIError("Não foi possível concluir a resposta pela OpenAI.");
  }
}
