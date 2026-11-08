// Supervisor LOCAL explícito. Não é importado por nenhuma rota ou pelo worker.
import { execFileSync } from "node:child_process";
import { readFileSync,writeFileSync,existsSync,mkdirSync,statSync,realpathSync,readdirSync } from "node:fs";
import { resolve,join,relative,isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { RESEARCH_POLICY } from "../config/research-policy";
import { validateCandidate,renderPolicy,POLICY_TARGET } from "../lib/research/proposal";
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
function main(){
  const args=process.argv.slice(2);
  if(args.length!==1||args[0]!=="--confirm-create-branch")throw new Error("Confirmação explícita necessária: --confirm-create-branch. Não há modo apply/push/merge.");
  const root=process.cwd();
  // Arquivo vazio portável: Git for Windows não aceita o device path os.devNull.
  const safeGit=resolve(".tools/research-git"),hooks=join(safeGit,"empty-hooks"),emptyConfig=join(safeGit,"empty-config");
  mkdirSync(hooks,{recursive:true});
  const safetyPath=relative(realpathSync(root),realpathSync(hooks));
  if(safetyPath.startsWith("..")||isAbsolute(safetyPath)||readdirSync(hooks).length)throw new Error("Diretório de hooks inválido.");
  if(!existsSync(emptyConfig))writeFileSync(emptyConfig,"",{flag:"wx",mode:0o600});
  if(statSync(emptyConfig).size!==0)throw new Error("Configuração Git não está vazia.");
  const git=(...args:string[])=>execFileSync("git",["-c","core.hooksPath="+hooks,"-c","core.fsmonitor=false",...args],{cwd:root,encoding:"utf8",windowsHide:true,timeout:10000,stdio:["ignore","pipe","pipe"],env:{NODE_ENV:"test",PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP,GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:emptyConfig}}).trim();
  if(resolve(git("rev-parse","--show-toplevel"))!==resolve(root))throw new Error("Abra a raiz do projeto.");
  if(!/^(?:https:\/\/github\.com\/|git@github\.com:)luisgussamazon\/baixardado(?:\.git)?$/.test(git("remote","get-url","origin")))throw new Error("Repositório não autorizado.");
  if(!git("branch","--show-current").startsWith("feature/")||git("status","--porcelain"))throw new Error("Use uma branch feature limpa e revisada.");
  const baseline=readFileSync(POLICY_TARGET,"utf8").replace(/\r\n/g,"\n");
  const manifestPath=".tools/research-results/manifest.json",candidatePath=".tools/research-results/proposal-policy.json";
  if(statSync(manifestPath).size>4000||statSync(candidatePath).size>100000)throw new Error("Artefatos acima do limite.");
  const manifestRaw=readFileSync(manifestPath,"utf8"),candidateRaw=readFileSync(candidatePath,"utf8");
  if(manifestRaw.length>4000||candidateRaw.length>100000)throw new Error("Artefatos acima do limite.");
  const manifest=JSON.parse(manifestRaw),candidate:unknown=JSON.parse(candidateRaw);
  if(manifest.target!==POLICY_TARGET||manifest.baselineSha256!==hash(baseline)||manifest.candidateSha256!==hash(candidateRaw))throw new Error("Artefato alterado ou baseline desatualizada.");
  validateCandidate(RESEARCH_POLICY,candidate);
  const id=manifest.candidateSha256.slice(0,12),branch="proposal/a3x-research-"+id;
  const parent=resolve(".tools/research-review"),destination=join(parent,id),rel=relative(parent,destination);
  if(rel.startsWith("..")||isAbsolute(rel)||existsSync(destination))throw new Error("Destino inválido ou já existente; nada será sobrescrito.");
  mkdirSync(parent,{recursive:true});
  const realParent=realpathSync(parent),realRoot=realpathSync(root),inside=relative(realRoot,realParent);
  if(inside.startsWith("..")||isAbsolute(inside))throw new Error("Destino aponta para fora do repositório.");
  git("worktree","add","-b",branch,destination,"HEAD");
  writeFileSync(join(destination,POLICY_TARGET),renderPolicy(candidate),{mode:0o600});
  console.log(JSON.stringify({branch,worktree:relative(root,destination),changedFile:POLICY_TARGET,committed:false,pushed:false,merged:false,deployed:false,review:"Revise o diff e execute testes no worktree. Qualquer publicação da proposta exige nova aprovação humana."},null,2));
}
try{main();}catch{console.error("Proposta não preparada. Confirme flag, repositório, branch limpa, hashes e destino. Nenhum commit, push ou deploy foi executado.");process.exitCode=1;}
