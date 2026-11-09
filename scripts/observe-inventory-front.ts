import {credentialStore} from "./credential-store";
import {localLearningStore} from "./local-learning-store";
import {observeInventoryFront} from "./inventory-front";
import {learningChunks} from "../lib/local-learning";
async function main(){
  const args=process.argv.slice(2);if(args.length!==2||args[0]!=="--url")throw new Error("Use --url com a tela autorizada.");
  const server=new URL(process.env.A3X_SERVER_URL||"https://baixardado-production.up.railway.app");
  if(server.protocol!=="https:"||server.username||server.password||server.pathname!=="/"||server.search||server.hash)throw new Error("Servidor inválido.");
  const credential=credentialStore(server.href).load();if(!credential)throw new Error("Conexão necessária.");
  const res=await fetch(new URL("/api/local-model/session",server),{method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+credential.token},body:JSON.stringify({action:"resume"}),signal:AbortSignal.timeout(20000)});
  if(!res.ok||(await res.json()).ok!==true)throw new Error("Conexão não autorizada.");
  const store=localLearningStore(server.href,credential.token),bundle=store.load();if(!bundle)throw new Error("Importe o pacote primeiro.");
  const observation=await observeInventoryFront(args[1]);
  bundle.documents=[...bundle.documents.filter(name=>name!==observation.name),observation.name];
  bundle.chunks=[...bundle.chunks.filter(chunk=>chunk.document!==observation.name),...learningChunks([observation])].map((chunk,index)=>({...chunk,id:`L${index+1}`}));
  store.save(bundle);console.log(JSON.stringify({observed:"public-login-only",origin:"https://icqa-tool-production.up.railway.app",authenticatedPagesObserved:false,formsSubmitted:false,inventoryChanged:false,documents:bundle.documents.length,chunks:bundle.chunks.length}));
}
main().catch(()=>{console.error("Observação pública não concluída. Nenhum login, formulário ou ajuste foi executado. Confira a URL e a conexão.");process.exitCode=1;});
