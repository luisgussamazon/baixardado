import { readFile,writeFile,mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { createHash } from "node:crypto";
import { RESEARCH_POLICY } from "../config/research-policy";
import { LIMITS,type runStudy } from "../lib/research/study";
import { policyPatch,validateCandidate,POLICY_TARGET } from "../lib/research/proposal";
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
async function main(){
  if(process.argv.length>2)throw new Error("Este comando usa somente o benchmark versionado; não aceita caminhos ou código externos.");
  const raw=await readFile("research/autonomia-v1/benchmark.json","utf8");if(Buffer.byteLength(raw)>2_000_000)throw new Error("Conjunto excede limite.");
  const baseline=(await readFile(POLICY_TARGET,"utf8")).replace(/\r\n/g,"\n");
  const cache=resolve(".tools/research-cache");await mkdir(cache,{recursive:true});
  const result=await new Promise<{report:ReturnType<typeof runStudy>;resources:Record<string,string|number>}>((accept,reject)=>{
    const worker=new Worker(resolve("scripts/research-worker.mjs"),{workerData:{dataset:JSON.parse(raw),policy:RESEARCH_POLICY},env:{TZ:"UTC",TEMP:cache,TMP:cache,TMPDIR:cache,TSX_DISABLE_CACHE:"1"},execArgv:[],resourceLimits:{maxOldGenerationSizeMb:LIMITS.workerHeapMb,maxYoungGenerationSizeMb:32,stackSizeMb:4}});
    let received=false;
    const timer=setTimeout(()=>{void worker.terminate();reject(new Error("Limite de tempo do worker excedido."));},LIMITS.wallTimeMs);
    worker.once("message",result=>{received=true;clearTimeout(timer);void worker.terminate();result.ok?accept(result):reject(new Error(result.error));});
    worker.once("error",()=>{clearTimeout(timer);reject(new Error("Worker interrompido sem detalhes de ambiente."));});
    worker.once("exit",()=>{clearTimeout(timer);if(!received)reject(new Error("Worker encerrado antes da conclusão."));});
  });
  const {proposedPolicy,...report}=result.report;validateCandidate(RESEARCH_POLICY,proposedPolicy);
  const candidate=JSON.stringify(proposedPolicy,null,2)+"\n",dir=".tools/research-results";
  await mkdir(dir,{recursive:true});
  const manifest={target:POLICY_TARGET,baselineSha256:hash(baseline),candidateSha256:hash(candidate),benchmarkSha256:hash(raw.replace(/\r\n/g,"\n")),application:"not-applied",approvalRequired:true};
  await writeFile(dir+"/report.json",JSON.stringify({...report,provenance:manifest,resources:result.resources},null,2)+"\n",{mode:0o600});
  await writeFile(dir+"/proposal-policy.json",candidate,{mode:0o600});
  await writeFile(dir+"/proposal.patch",policyPatch(baseline,proposedPolicy),{mode:0o600});
  await writeFile(dir+"/manifest.json",JSON.stringify(manifest,null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify({originalValidation:report.original.validation.accuracy,candidateValidation:report.candidate.validation.accuracy,originalHoldout:report.original.holdout.accuracy,candidateHoldout:report.candidate.holdout.accuracy,changes:report.changes.length,selectedForHumanReview:report.decision.selectedForHumanReview,applied:false,output:dir,resources:result.resources},null,2));
}
main().catch(()=>{console.error("Estudo não concluído. Verifique os arquivos versionados e os limites; nenhum segredo foi acessado e nenhuma proposta foi aplicada.");process.exitCode=1;});
