import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const SERVER='https://baixardado-production.up.railway.app';
export const AUTONOMY_ALLOWED=['components/chat-app.tsx','components/mode-switch.tsx','app/a3x-theme.css','app/workspace-theme.css','app/globals.css','lib/a3x-personality.ts','lib/knowledge-terms.ts','lib/research/classifier.ts','components/project-tree.tsx'];
export async function publishAutonomy({github,core,context,root=process.cwd()}){
 const state=JSON.parse(await fs.readFile(path.join(root,'.autonomy/validated.json'),'utf8'));
 if(context.repo.owner!=='luisgussamazon'||context.repo.repo!=='baixardado'||! /^[a-f0-9-]{36}$/.test(state.id)||state.base!==context.sha||!Array.isArray(state.files)||!state.files.length||state.files.length>3||new Set(state.files.map(f=>f.path)).size!==state.files.length||!state.files.every(f=>AUTONOMY_ALLOWED.includes(f.path)))throw Error('Escopo de publicação inválido.');
 const worktree=await fs.realpath(path.resolve(root,state.worktree)),inside=path.relative(path.join(root,'.tools/source-agent/review'),worktree);if(!inside||inside.startsWith('..')||path.isAbsolute(inside))throw Error('Worktree inválido.');
 const token=await core.getIDToken('a3x-autonomy');const authorized=await fetch(SERVER+'/api/autonomy',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'authorize',id:state.id}),redirect:'error',signal:AbortSignal.timeout(15000)});if(!authorized.ok)throw Error('Publicação não autorizada.');
 const args={owner:'luisgussamazon',repo:'baixardado'},ref=await github.rest.git.getRef({...args,ref:'heads/main'});if(ref.data.object.sha!==state.base)throw Error('Main mudou; sem rebase ou sobrescrita automática.');
 const base=await github.rest.git.getCommit({...args,commit_sha:state.base}),tree=[];
 for(const f of state.files){const raw=await fs.readFile(path.join(worktree,f.path));if(createHash('sha256').update(raw).digest('hex')!==f.hash)throw Error('Hash divergente.');const blob=await github.rest.git.createBlob({...args,content:raw.toString('base64'),encoding:'base64'});tree.push({path:f.path,mode:'100644',type:'blob',sha:blob.data.sha});}
 const nextTree=await github.rest.git.createTree({...args,base_tree:base.data.tree.sha,tree}),commit=await github.rest.git.createCommit({...args,message:'A3X: melhoria autônoma validada\n\nCiclo '+state.id,tree:nextTree.data.sha,parents:[state.base]});
 await github.rest.git.createRef({...args,ref:'refs/heads/agent/autonomy-'+state.id,sha:commit.data.sha});
 await github.rest.git.updateRef({...args,ref:'heads/main',sha:commit.data.sha,force:false});
 await fs.writeFile(path.join(root,'.autonomy/outcome.json'),JSON.stringify({id:state.id,status:'published',commit:commit.data.sha}));console.log('Commit validado publicado em main.');
 // GITHUB_TOKEN não dispara outra execução Actions por push; a validação isolada já ocorreu acima.
 for(let attempt=0;attempt<35;attempt++){
  const deployments=await github.rest.repos.listDeployments({...args,sha:commit.data.sha,per_page:5});
  for(const deploy of deployments.data){if(deploy.environment!=='considerate-caring / production')continue;const statuses=await github.rest.repos.listDeploymentStatuses({...args,deployment_id:deploy.id,per_page:1});const status=statuses.data[0]?.state;if(status==='success'){const health=await fetch(SERVER+'/api/health',{redirect:'error',signal:AbortSignal.timeout(15000)});if(!health.ok||(await health.json()).ok!==true)throw Error('Aplicação não está saudável.');await fs.writeFile(path.join(root,'.autonomy/outcome.json'),JSON.stringify({id:state.id,status:'deployed',commit:commit.data.sha}));console.log('Railway confirmou a implantação.');return;}if(['error','failure'].includes(status))throw Error('Railway recusou o deploy.');}
  await new Promise(resolve=>setTimeout(resolve,15000));
 }
 throw Error('Commit publicado; implantação não confirmada no prazo. A autonomia será pausada.');
}
