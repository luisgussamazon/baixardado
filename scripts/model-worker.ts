// Processo do computador do usuário. Somente requisições HTTPS de saída e Ollama em loopback.
import { inferOnComputer } from "../lib/local-inference";
const abort=new AbortController();process.on("SIGINT",()=>abort.abort());process.on("SIGTERM",()=>abort.abort());
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function main(){
  if(process.argv.length>2)throw new Error("Não são aceitos comandos ou tokens na linha de execução.");
  const server=new URL(process.env.A3X_SERVER_URL||"https://baixardado-production.up.railway.app");
  if(server.protocol!=="https:"||server.username||server.password||server.search||server.hash||server.pathname!=="/")throw new Error("Servidor HTTPS inválido.");
  const tags=await fetch("http://127.0.0.1:11434/api/tags",{signal:AbortSignal.timeout(10000)}).then(r=>r.json());
  if(!tags.models?.some((model:{name:string})=>model.name==="qwen3:4b-instruct"))throw new Error("Instale o modelo qwen3:4b-instruct antes de conectar.");
  const json=async(path:string,body?:unknown,token?:string)=>{
    const response=await fetch(new URL(path,server),{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:"error",signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])});
    if(!response.ok)throw new Error(response.status===401?"revoked":"Ponte indisponível.");return response.json();
  };
  const pairing=await json("/api/local-model/pair",{model:"qwen3:4b-instruct"});
  if(!/^[a-f0-9]{64}$/.test(pairing.token)||!/^[A-F0-9]{12}$/.test(pairing.code))throw new Error("Resposta de conexão inválida.");
  // Código público só localiza a solicitação: não é o token secreto da conexão.
  console.log("Abra sua conta e aprove este computador: "+new URL("/conectar?code="+pairing.code,server).href);
  console.log("Código de conexão: "+pairing.code+". Expira em dez minutos. Nenhum token secreto é exibido ou salvo.");
  const deadline=Date.now()+600000;let approved=false;
  while(Date.now()<deadline&&!abort.signal.aborted){
    const status=await json("/api/local-model/pair",undefined,pairing.token);
    if(status.status==="approved"){approved=true;break;}await sleep(3000);
  }
  if(!approved)throw new Error("Conexão não aprovada a tempo.");
  console.log("Computador conectado. Modelo local sem ferramentas de execução. Ctrl+C desconecta. Ao reiniciar, aprove nova conexão.");
  while(!abort.signal.aborted){
    try{
      const {job}=await json("/api/local-model/jobs",{action:"poll"},pairing.token);
      if(!job){await sleep(2500);continue;}
      if(typeof job.id!=="string"||!/^[a-f0-9-]{36}$/.test(job.id))throw new Error("Solicitação inválida.");
      const jobAbort=new AbortController();
      const heartbeat=setInterval(()=>{void json("/api/local-model/jobs",{action:"heartbeat",id:job.id},pairing.token).then(state=>{if(state.active!==true)jobAbort.abort();}).catch(error=>{if((error as Error).message==="revoked"){jobAbort.abort();abort.abort();}});},10000);
      try{const result=await inferOnComputer(job.payload,AbortSignal.any([abort.signal,jobAbort.signal]));await json("/api/local-model/jobs",{action:"complete",id:job.id,result},pairing.token);}
      catch{if(!abort.signal.aborted)await json("/api/local-model/jobs",{action:"complete",id:job.id,failed:true},pairing.token).catch(()=>{});}
      finally{clearInterval(heartbeat);}
    }catch(error){if((error as Error).message==="revoked")throw new Error("Conexão revogada ou expirada.");if(!abort.signal.aborted)await sleep(5000);}
  }
}
main().catch(()=>{console.error("Computador desconectado. Verifique Ollama, modelo instalado, conexão e autorização na sua conta. Nenhum segredo foi exibido.");process.exitCode=1;});
