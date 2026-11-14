import {EngineeringFailure,providerEngineeringFailure,safeEngineeringFailure} from "./engineering-errors";
import {OPENAI_MODEL,openAIConfigured,reserveAIUsage,finishAIUsage,CloudAIError,selectedProvider} from "./ai-provider";
import {ENGINEERING_TOOLS,engineeringTool} from "./engineering-tools";
// Same configured model, price ledger and conservative reservations as Chat. Only read tools.
export async function engineeringPlan(userId:string,system:string,goal:string,signal:AbortSignal,beforeRound?:(reservation:number)=>Promise<unknown>){
 const input:unknown[]=[{role:"system",content:system},{role:"user",content:goal}];let calls=0;
 for(let round=0;round<4;round++){
  if(!openAIConfigured()||await selectedProvider(userId)!=="openai")throw new CloudAIError("Modelo ou consentimento indisponível.");
  const finalRound=round===3;if(finalRound)input.push({role:"system",content:'Finalize agora: use apenas os dados ja recebidos. Nao solicite ferramentas. Retorne somente o plano JSON com path, hypothesis e criterion.'});
  const encoded=JSON.stringify(input);if(encoded.length>32000)throw new EngineeringFailure("PLAN_CONTEXT");signal.throwIfAborted();
  const reservation=Math.ceil((Buffer.byteLength(encoded)+4096)*.1+1200*.5);await beforeRound?.(reservation);
  const usageId=await reserveAIUsage(userId,reservation);let settled=false,requested=false;
  try{
   requested=true;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+process.env.OPENAI_API_KEY!.trim()},body:JSON.stringify({model:OPENAI_MODEL,input,tools:ENGINEERING_TOOLS,tool_choice:finalRound?"none":"auto",parallel_tool_calls:false,reasoning:{effort:"none"},max_output_tokens:1200,service_tier:"default",store:false,stream:false,text:{format:{type:"json_object"}}}),signal:AbortSignal.any([signal,AbortSignal.timeout(90000)])});
   if(!r.ok){await r.body?.cancel();if(r.status>=400&&r.status<500){await finishAIUsage(usageId,"rejected");settled=true;}throw providerEngineeringFailure(r.status);}
   if(!r.body)throw Error("Empty response");const reader=r.body.getReader();let raw="",bytes=0;const decoder=new TextDecoder("utf-8",{fatal:true});try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>96000)throw Error("Response too large");raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{await reader.cancel();}
   const result=JSON.parse(raw),incoming=result.usage?.input_tokens,outgoing=result.usage?.output_tokens;
   if(Number.isSafeInteger(incoming)&&incoming>=0&&incoming<=200000&&Number.isSafeInteger(outgoing)&&outgoing>=0&&outgoing<=1200){await finishAIUsage(usageId,"succeeded",{input:incoming,output:outgoing});settled=true;}
   if(result.status!=="completed"||!Array.isArray(result.output)||result.output.length>12)throw Error("Incomplete response");
   const tools=result.output.filter((v:{type?:string})=>v.type==="function_call");
   if(tools.length){
    if(finalRound)throw new EngineeringFailure("PLAN_TOOL_FINAL");
    for(const tool of tools){if(++calls>6||typeof tool.call_id!=="string"||!/^[a-zA-Z0-9_-]{1,200}$/.test(tool.call_id)||typeof tool.name!=="string"||typeof tool.arguments!=="string"||tool.arguments.length>1000)throw new EngineeringFailure("PLAN_TOOL_LIMIT");if(!ENGINEERING_TOOLS.some(t=>t.name===tool.name))throw new EngineeringFailure("PLAN_TOOL_SCOPE");let value;try{value=await engineeringTool(tool.name,JSON.parse(tool.arguments));}catch(error){if(error instanceof SyntaxError||error instanceof Error&&["Invalid tool arguments","Tool not authorized","Source outside authorized scope"].includes(error.message))value={error:"Argumentos ou arquivo fora do catalogo editavel. Use list_sources e selecione somente um path retornado. Nao ha acesso a outros arquivos."};else throw error;}input.push({type:"function_call",call_id:tool.call_id,name:tool.name,arguments:tool.arguments},{type:"function_call_output",call_id:tool.call_id,output:JSON.stringify(value)});}
   }else{
    const text=result.output.filter((v:{type?:string;role?:string})=>v.type==="message"&&v.role==="assistant").flatMap((v:{content?:{type:string;text?:string}[]})=>v.content??[]).filter((v:{type:string;text?:string})=>v.type==="output_text"&&typeof v.text==="string").map((v:{text:string})=>v.text).join("\n");if(!text||text.length>4000)throw Error("Invalid plan");if(!settled){await finishAIUsage(usageId,"unknown");settled=true;}return text;
   }
   if(!settled){await finishAIUsage(usageId,"unknown");settled=true;}
  }catch(error){if(!settled)await finishAIUsage(usageId,requested?"unknown":"rejected").catch(()=>{});throw safeEngineeringFailure(error);}
 }
 throw new EngineeringFailure("PLAN_TOOLS");
}
