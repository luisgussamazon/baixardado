import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {credentialStore} from "./credential-store";
import {localLearningStore,type LearningBundle} from "./local-learning-store";
import {readLearningZip} from "./learning-zip";
import {learningChunks} from "../lib/local-learning";
async function main(){
  const args=process.argv.slice(2),apply=args.includes("--apply"),index=args.indexOf("--zip");
  if(index<0||!args[index+1]||args.some((arg,i)=>arg!=="--zip"&&arg!=="--apply"&&i!==index+1))throw new Error("Use --zip caminho e, após revisar, --apply.");
  if(statSync(args[index+1]).size>2_000_000)throw new Error("ZIP acima do limite.");
  const bytes=readFileSync(args[index+1]),documents=readLearningZip(bytes),chunks=learningChunks(documents),digest=createHash("sha256").update(bytes).digest("hex");
  console.log(JSON.stringify({mode:apply?"apply-local-private":"dry-run",documents:documents.length,chunks:chunks.length,sourceSha256:digest,executedPackageFiles:false,uploadedDocuments:false}));
  if(!apply)return;
  const server=new URL(process.env.A3X_SERVER_URL||"https://baixardado-production.up.railway.app");
  if(server.protocol!=="https:"||server.username||server.password||server.pathname!=="/"||server.search||server.hash)throw new Error("Servidor inválido.");
  const credential=credentialStore(server.href).load();if(!credential)throw new Error("Vincule sua conta à ponte antes de instalar conhecimento privado.");
  const response=await fetch(new URL("/api/local-model/session",server),{method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+credential.token},body:JSON.stringify({action:"resume"}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error("Conexão não autorizada; nenhum documento foi enviado ao servidor.");
  const state=await response.json();if(state.ok!==true||state.remembered!==true)throw new Error("Ative a reconexão lembrada antes de instalar a base local.");
  const store=localLearningStore(server.href,credential.token),bundle:LearningBundle={version:1,kind:"inventory-documents",binding:store.binding,sourceSha256:digest,importedAt:new Date().toISOString(),documents:documents.map(d=>d.name),chunks};
  store.save(bundle);console.log("Conhecimento instalado somente no computador, criptografado e vinculado à conexão autorizada. Reinicie a ponte para carregar a base.");
}
main().catch(()=>{console.error("Importação não concluída. Confira ZIP, limites, Windows e vínculo da ponte. Nenhum segredo foi exibido.");process.exitCode=1;});
