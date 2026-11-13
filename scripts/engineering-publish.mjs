import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AUTONOMY_ALLOWED} from './autonomy-publish.mjs';
export async function publishEngineering({github,context,authorize,root=process.cwd()}){
 const state=JSON.parse(await fs.readFile(path.join(root,'.autonomy/validated.json'),'utf8'));
 if(context.repo.owner!=='luisgussamazon'||context.repo.repo!=='baixardado'||state.base!==context.sha||!/^[a-f0-9-]{36}$/.test(state.id)||state.checked!==true||!Array.isArray(state.files)||!state.files.length||state.files.length>3||new Set(state.files.map(f=>f.path)).size!==state.files.length||!state.files.every(f=>AUTONOMY_ALLOWED.includes(f.path)))throw Error('Invalid validated scope');
 const worktree=await fs.realpath(path.resolve(root,state.worktree)),rel=path.relative(path.join(root,'.tools/source-agent/review'),worktree);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('Invalid worktree');
 await authorize();const args={owner:'luisgussamazon',repo:'baixardado'};if((await github.rest.git.getRef({...args,ref:'heads/main'})).data.object.sha!==state.base)throw Error('Main changed; new review required');
 const base=await github.rest.git.getCommit({...args,commit_sha:state.base}),tree=[];
 for(const f of state.files){const content=await fs.readFile(path.join(worktree,f.path));if(createHash('sha256').update(content).digest('hex')!==f.hash)throw Error('Hash changed');const blob=await github.rest.git.createBlob({...args,content:content.toString('base64'),encoding:'base64'});tree.push({path:f.path,mode:'100644',type:'blob',sha:blob.data.sha});}
 const next=await github.rest.git.createTree({...args,base_tree:base.data.tree.sha,tree}),commit=await github.rest.git.createCommit({...args,message:'A3X: proposta validada '+state.id,tree:next.data.sha,parents:[state.base]}),branch='agent/engineering-'+state.id;
 await authorize();await github.rest.git.createRef({...args,ref:'refs/heads/'+branch,sha:commit.data.sha});
 // No main write, merge, deployment or model-provided text in the public PR.
 const pr=await github.rest.pulls.create({...args,head:branch,base:'main',title:'A3X: melhoria validada para revisão',body:'Proposta de código público validada em contêiner isolado. Testes, typecheck e build da base e da versão experimental concluídos. Revisão independente obrigatória antes de integrar ou publicar.\n\nTarefa: '+state.id+'\nArquivos: '+state.files.map(f=>f.path).join(', '),draft:false});
 return {commit:commit.data.sha,pr:pr.data.number};
}
