// HTTPS de saída + Ollama em loopback. DPAPI opcional; servidor guarda somente hash.
import {inferOnComputer} from "../lib/local-inference";
import {credentialStore} from "./credential-store";
import {localLearningStore} from "./local-learning-store";
import {addLearningContext,learningSelectionPayload,localDocumentReply,type LearningChunk} from "../lib/local-learning";
const abort=new AbortController();process.on("SIGINT",()=>abort.abort());process.on("SIGTERM",()=>abort.abort());
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
import {connectComputer,ConnectionUnauthorized as Unauthorized} from "./model-link";
async function main(){
  if(process.argv.length>2)throw new Error("Argumentos não permitidos.");
  const server=new URL(process.env.A3X_SERVER_URL||"https://baixardado-production.up.railway.app");
  if(server.protocol!=="https:"||server.username||server.password||server.search||server.hash||server.pathname!=="/")throw new Error("Servidor HTTPS inválido.");
  const tags=await fetch("http://127.0.0.1:11434/api/tags",{signal:AbortSignal.timeout(10000)}).then(response=>response.json());
  if(!tags.models?.some((model:{name:string})=>model.name==="qwen3:4b-instruct"))throw new Error("Modelo autorizado ausente.");
  const store=process.platform==="win32"&&process.env.A3X_REMEMBER_COMPUTER!=="0"?credentialStore(server.href):null;
  const json=async(path:string,body?:unknown,token?:string)=>{
    const response=await fetch(new URL(path,server),{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:"error",signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])});
    if(response.status===401)throw new Unauthorized();if(!response.ok)throw new Error("Ponte indisponível.");return response.json();
  };
  const connection=await connectComputer(server,json,store,abort.signal,sleep,message=>console.log(message));
  if(!connection||abort.signal.aborted)return;
  let localChunks:LearningChunk[]=[];
  try{localChunks=localLearningStore(server.href,connection.token).load()?.chunks??[];console.log(`Base privada local: ${localChunks.length} trechos disponíveis.`);}catch{console.error("Base privada local indisponível; o Chat continua sem esse pacote.");}
  console.log("Computador conectado. Falhas de rede serão recuperadas automaticamente. Revogue em /conectar para remover o acesso.");
  while(!abort.signal.aborted){
    try{
      const {job}=await json("/api/local-model/jobs",{action:"poll"},connection.token);
      if(!job){await sleep(2500);continue;}
      if(typeof job.id!=="string"||!/^[a-f0-9-]{36}$/.test(job.id))throw new Error("Solicitação inválida.");
      const jobAbort=new AbortController();
      const heartbeat=setInterval(()=>{void json("/api/local-model/jobs",{action:"heartbeat",id:job.id},connection!.token).then(state=>{if(state.active!==true)jobAbort.abort();}).catch(error=>{if(error instanceof Unauthorized){store?.clear();jobAbort.abort();abort.abort();}});},10000);
      try{
        const enriched=addLearningContext(job.payload,localChunks),signal=AbortSignal.any([abort.signal,jobAbort.signal]);
        const result=enriched.sources.length?localDocumentReply(enriched.sources,await inferOnComputer(learningSelectionPayload(enriched.payload),signal,16),enriched.payload.messages.at(-1)?.content):await inferOnComputer(enriched.payload,signal);
        await json("/api/local-model/jobs",{action:"complete",id:job.id,result:result.slice(0,12000)},connection.token);
      }
      catch{if(!abort.signal.aborted)await json("/api/local-model/jobs",{action:"complete",id:job.id,failed:true},connection.token).catch(()=>{});}
      finally{clearInterval(heartbeat);}
    }catch(error){if(error instanceof Unauthorized){store?.clear();console.error("Acesso revogado ou expirado. Uma nova vinculação exige autorização da conta.");return;}if(!abort.signal.aborted)await sleep(5000);}
  }
}
main().catch(()=>{console.error("Ponte indisponível. Verifique a credencial protegida e o servidor. Nenhum segredo foi exibido.");process.exitCode=1;});
