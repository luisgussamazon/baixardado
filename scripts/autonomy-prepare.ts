import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {applyLocalSourceProposal} from "./source-worktree";
import {validateInSandbox} from "./autonomy-sandbox.mjs";
import {validateAutonomousChanges} from "./autonomy-safety";
import {execFileSync} from "node:child_process";
async function main(){
 const root=process.cwd(),run=JSON.parse(readFileSync(".autonomy/run.json","utf8"));if(!/^[a-f0-9-]{36}$/.test(run.id)||run.status!=="ready")throw Error("Ciclo inválido.");
 const inputs=run.proposal.files.map((f:{path:string;sha:string})=>{if(!/^[a-zA-Z0-9_./-]+$/.test(f.path)||f.path.includes(".."))throw Error("Caminho inválido.");return {path:f.path,sha:execFileSync("git",["-c","core.fsmonitor=false","rev-parse","HEAD:"+f.path],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim(),content:execFileSync("git",["-c","core.fsmonitor=false","show","HEAD:"+f.path],{encoding:"utf8",maxBuffer:60000,stdio:["ignore","pipe","pipe"]})};});
 validateAutonomousChanges(run.proposal,inputs);
 const result=applyLocalSourceProposal(root,run.proposal),worktree=resolve(root,result.worktree);
 const files=result.files.map(path=>({path,hash:createHash("sha256").update(readFileSync(join(worktree,path))).digest("hex")}));
 await validateInSandbox(root,worktree);
 for(const f of files)if(createHash("sha256").update(readFileSync(join(worktree,f.path))).digest("hex")!==f.hash)throw Error("Conteúdo mudou durante a validação.");
 mkdirSync(".autonomy",{recursive:true});writeFileSync(".autonomy/validated.json",JSON.stringify({id:run.id,base:process.env.GITHUB_SHA,worktree:result.worktree,files}),{flag:"wx"});console.log("Proposta validada em ambiente isolado. Pronta para publicação autorizada.");
}
main().catch(()=>{console.error("Ciclo interrompido durante preparação ou validação. Nenhum código foi publicado.");process.exitCode=1;});
