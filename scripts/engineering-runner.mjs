import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateInSandbox} from './autonomy-sandbox.mjs';
import {publishEngineering} from './engineering-publish.mjs';
const SERVER='https://baixardado-production.up.railway.app';
export async function runEngineering({github,core,context,task:claimedTask,root=process.cwd()}){
 const call=async body=>{const token=await core.getIDToken('a3x-engineering');const r=await fetch(SERVER+'/api/engineering/worker',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(body.action==='prepare'?235000:15000)});if(!r.ok)throw Error('Task unavailable or stage rejected');return r.json();};
 const task=claimedTask??(await call({action:'claim'})).task;if(!task){core.info('Nenhuma tarefa na fila.');return;}if(!/^[a-f0-9-]{36}$/.test(task.id)||task.base!==context.sha)throw Error('Invalid claimed task');
 const event=(agent,state,code)=>call({action:'event',id:task.id,agent,state,code});let timer,activeAgent='architect';const abort=new AbortController();
 try{
  const run=await call({action:'prepare',id:task.id});if(run.status==='completed')return;
  timer=setInterval(()=>{void call({action:'heartbeat',id:task.id}).catch(()=>abort.abort());},10000);
  await fs.mkdir(path.join(root,'.autonomy'),{recursive:true});let worktree=root;
  if(run.status==='ready'){
   await fs.writeFile(path.join(root,'.autonomy/run.json'),JSON.stringify(run));activeAgent='security';await event('security','running','static-policy');
   execFileSync(path.join(root,'node_modules/.bin/tsx'),['scripts/engineering-prepare.ts'],{cwd:root,timeout:30000,maxBuffer:100000,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,HOME:process.env.HOME,GITHUB_SHA:context.sha,NODE_ENV:'test'}});
   const state=JSON.parse(await fs.readFile(path.join(root,'.autonomy/validated.json'),'utf8'));worktree=path.resolve(root,state.worktree);await event('security','passed','static-policy-passed');
  }
  activeAgent='tester';await event('tester','running','baseline-validation');const baseline=await validateInSandbox(root,root,{signal:abort.signal});await call({action:'heartbeat',id:task.id});
  const candidate=run.status==='ready'?await validateInSandbox(root,worktree,{signal:abort.signal,onStage:async(command,state)=>{await event('tester',state,command.startsWith('npm test')?'tests':command.includes('typecheck')?'typecheck':'build');}}):baseline;
  abort.signal.throwIfAborted();await event('tester','passed','isolated-validation-passed');activeAgent='optimizer';await event('optimizer','running','compare-measurements');
  let changedBytes=0;if(run.proposal)for(const edit of run.proposal.edits)changedBytes+=Buffer.byteLength(edit.newText)-Buffer.byteLength(edit.oldText);
  const metrics={baselineMs:baseline.durationMs,candidateMs:candidate.durationMs,changedBytes};await event('optimizer','passed','measured-runtime-not-performance-proof');
  if(run.status==='validate'){await call({action:'finish',id:task.id,status:'completed',metrics});return;}
  const stateFile=path.join(root,'.autonomy/validated.json'),state=JSON.parse(await fs.readFile(stateFile,'utf8'));for(const f of state.files)if(createHash('sha256').update(await fs.readFile(path.join(worktree,f.path))).digest('hex')!==f.hash)throw Error('Source changed during validation');state.checked=true;await fs.writeFile(stateFile,JSON.stringify(state));
  activeAgent='evolution';await event('evolution','running','create-review-branch');const outcome=await publishEngineering({github,context,root,authorize:()=>call({action:'authorize',id:task.id})});await call({action:'finish',id:task.id,status:'review',...outcome,metrics});core.info('Branch e PR criados. Produção aguarda revisão independente.');
 }catch{abort.abort();await event(activeAgent,'failed','runner-stage-rejected').catch(()=>{});await call({action:'finish',id:task.id,status:'failed'}).catch(()=>{});throw Error('Engineering interrupted. No main update or deployment authorized.');}
 finally{if(timer)clearInterval(timer);}
}
