// Protocolo SSE restrito a metadados; o código só é carregado depois de validado no servidor.
export async function readProjectEvents(body:ReadableStream<Uint8Array>, onEvent:(event:string,data:Record<string,unknown>)=>void):Promise<string> {
  const reader=body.getReader();
  const decoder=new TextDecoder();
  let buffer="",result="";
  function consume(part:string) {
    const lines=part.split("\n");
    const event=lines.find(line=>line.startsWith("event: "))?.slice(7);
    const dataLine=lines.find(line=>line.startsWith("data: "));
    if(!event||!dataLine)return;
    const data:unknown=JSON.parse(dataLine.slice(6));
    if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Resposta inválida do servidor.");
    const payload=data as Record<string,unknown>;
    if(event==="failure")throw new Error(typeof payload.message==="string"?payload.message:"Não foi possível concluir o projeto.");
    if(event==="done"&&typeof payload.id==="string")result=payload.id;
    onEvent(event,payload);
  }
  try {
    while(true){
      const part=await reader.read();
      if(part.done)break;
      buffer+=decoder.decode(part.value,{stream:true});
      let idx;
      while((idx=buffer.indexOf("\n\n"))!==-1){consume(buffer.slice(0,idx));buffer=buffer.slice(idx+2);}
      if(buffer.length>16_384)throw new Error("Resposta inválida do servidor.");
    }
    buffer+=decoder.decode();
    if(buffer.trim())consume(buffer);
    if(!result)throw new Error("Geração interrompida. Consulte o histórico antes de tentar novamente.");
    return result;
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
