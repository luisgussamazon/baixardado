export type InferenceMessage={role:"system"|"user"|"assistant";content:string};
export function validateInference(payload:unknown):payload is {messages:InferenceMessage[]}{
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return false;
  const data=payload as {messages?:unknown};
  return Object.keys(data).length===1&&Array.isArray(data.messages)&&data.messages.length>=1&&data.messages.length<=14&&
    data.messages.every(item=>item&&typeof item==="object"&&Object.keys(item).every(key=>["role","content"].includes(key))&&["system","user","assistant"].includes(item.role)&&typeof item.content==="string"&&item.content.length<=8000)&&
    data.messages.reduce((total,item)=>total+item.content.length,0)<=8500;
}
export async function inferOnComputer(payload:unknown,signal:AbortSignal){
  if(!validateInference(payload))throw new Error("Solicitação de modelo inválida.");
  const messages=payload.messages;
  const response=await fetch("http://127.0.0.1:11434/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.any([signal,AbortSignal.timeout(95000)]),body:JSON.stringify({model:"qwen3:4b-instruct",messages,stream:false,think:false,keep_alive:"5m",options:{num_ctx:4096,num_predict:384,temperature:.6}})});
  if(!response.ok||!response.body)throw new Error("Modelo local indisponível.");
  const reader=response.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true});let raw="",size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>64000){await reader.cancel();throw new Error("Resposta do modelo excede limite.");}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
  const result=JSON.parse(raw);
  if(result.done!==true||result.message?.role!=="assistant"||typeof result.message?.content!=="string"||!result.message.content.trim()||result.message.content.length>12000)throw new Error("Resposta incompleta do modelo.");
  let answer=result.message.content as string;
  // Algumas versões/templates retornam marcadores no campo content. Nunca exibir raciocínio interno.
  if(answer.includes("</think>"))answer=answer.slice(answer.lastIndexOf("</think>")+8);
  if(answer.includes("<think>"))throw new Error("Modelo não concluiu a resposta pública.");
  answer=answer.trim();if(!answer)throw new Error("Modelo não produziu resposta pública.");return answer;
}
