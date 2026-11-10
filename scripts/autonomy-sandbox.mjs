import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
export const SANDBOX_IMAGE='node:22-bookworm';
export function sandboxArgs(directory,modules,artifacts,uid,gid,command){return ['run','--rm','--network','none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit','256','--memory','3g','--cpus','2','--user',`${uid}:${gid}`,'--tmpfs','/tmp:rw,nosuid,nodev,size=768m','--mount',`type=bind,source=${directory},target=/workspace,readonly`,'--mount',`type=bind,source=${modules},target=/workspace/node_modules,readonly`,...['.next','.tools','.generated'].flatMap(name=>['--mount',`type=bind,source=${path.join(artifacts,name)},target=/workspace/${name}`]),'--mount',`type=bind,source=${path.join(artifacts,'extension.zip')},target=/workspace/public/a3x-navegador.zip`,'--workdir','/workspace','--env','HOME=/tmp/home','--env','CI=1','--env','NEXT_TELEMETRY_DISABLED=1','--env','A3X_SANDBOX=1',SANDBOX_IMAGE,'sh','-c','mkdir -p /tmp/home && '+command];}
export async function validateInSandbox(root,worktree){
 if(process.platform!=='linux')throw Error('A validação isolada requer runner Linux com Docker.');
 root=await fs.realpath(root);worktree=await fs.realpath(worktree);
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'a3x-isolated-'));
 const workspace=path.join(directory,'workspace');
 const excluded=new Set(['.git','.tools','.generated','.next','node_modules','.autonomy','.npmrc','.yarnrc','.netrc','.ssh','.aws','.codex','.agents','.vscode']);
 try{
  await fs.cp(worktree,workspace,{recursive:true,filter:async source=>{const rel=path.relative(worktree,source),parts=rel.split(path.sep);if(parts.some(p=>excluded.has(p)||p==='.env'||p.startsWith('.env.')))return false;const stat=await fs.lstat(source);if(stat.isSymbolicLink())throw Error('Links não são aceitos na cópia isolada.');return true;}});
  for(const name of ['.next','.tools','.generated','node_modules'])await fs.mkdir(path.join(workspace,name),{recursive:true});
  await fs.writeFile(path.join(workspace,'public/a3x-navegador.zip'),'');
  const user=os.userInfo();
  for(const [index,command] of ['npm test','npm run typecheck -- --incremental false','npm run build'].entries()){
   const artifacts=path.join(directory,'artifacts-'+index);await fs.mkdir(artifacts);for(const name of ['.next','.tools','.generated'])await fs.mkdir(path.join(artifacts,name));await fs.writeFile(path.join(artifacts,'extension.zip'),'');
   execFileSync('docker',sandboxArgs(workspace,path.join(root,'node_modules'),artifacts,user.uid,user.gid,command),{cwd:root,timeout:900000,maxBuffer:8000000,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,HOME:process.env.HOME}});
  }
 }catch{throw Error('Validação isolada falhou. Nenhuma publicação deve ocorrer.');}
 finally{const rel=path.relative(await fs.realpath(os.tmpdir()),directory);if(!rel.startsWith('a3x-isolated-')||rel.includes('..')||path.isAbsolute(rel))throw Error('Limpeza fora da pasta temporária.');await fs.rm(directory,{recursive:true,force:true});}
}
