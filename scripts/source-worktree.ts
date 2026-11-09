import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync,readFileSync,readdirSync,realpathSync,lstatSync} from "node:fs";
import {resolve,join,relative,isAbsolute,dirname} from "node:path";
import {randomUUID} from "node:crypto";
import ts from "typescript";
import {applySourceEdits,SOURCE_REPOSITORY,WRITABLE_SOURCE,type SourceProposal,type SourceFile} from "../lib/source-policy";
export function applyLocalSourceProposal(root:string,proposal:SourceProposal){
 root=realpathSync(root);
 const env:NodeJS.ProcessEnv={NODE_ENV:"test",PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP,GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:process.platform==="win32"?"NUL":"/dev/null"};
 const plain=(...args:string[])=>execFileSync("git",["-c","core.fsmonitor=false",...args],{cwd:root,env,windowsHide:true,timeout:15000,maxBuffer:1000000,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 if(realpathSync(plain("rev-parse","--show-toplevel"))!==root||! /^(?:https:\/\/github\.com\/|git@github\.com:)luisgussamazon\/baixardado(?:\.git)?$/.test(plain("remote","get-url","origin")))throw Error("Use somente o repositório "+SOURCE_REPOSITORY+".");
 if(plain("status","--porcelain"))throw Error("Revise e salve o checkout antes de aplicar a proposta.");
 if(plain("ls-tree","-r","--name-only","HEAD").split(/\r?\n/).some(p=>p.split("/").at(-1)===".gitattributes"))throw Error("Revise atributos e filtros Git antes de usar este aplicador.");
 if(!proposal||!Array.isArray(proposal.files)||proposal.files.length<1||proposal.files.length>3||!proposal.files.every(f=>WRITABLE_SOURCE.includes(f.path)&&/^[a-f0-9]{40}$/.test(f.sha)))throw Error("Manifesto inválido.");
 const files:SourceFile[]=proposal.files.map(f=>{if(!/^100(?:644|755) blob /.test(plain("ls-tree","HEAD","--",f.path)))throw Error("Somente arquivos regulares rastreados.");const sha=plain("rev-parse","HEAD:"+f.path);const content=execFileSync("git",["-c","core.fsmonitor=false","show","HEAD:"+f.path],{cwd:root,env,windowsHide:true,timeout:15000,maxBuffer:60000,encoding:"utf8",stdio:["ignore","pipe","pipe"]});return {path:f.path,sha,content};});
 const changes=applySourceEdits(proposal,files);
 for(const f of changes.filter(f=>/\.tsx?$/.test(f.path))){const result=ts.transpileModule(f.content,{fileName:f.path,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error("Sintaxe TypeScript inválida. Nenhum worktree foi criado.");}
 const ensure=(path:string)=>{mkdirSync(path,{recursive:true});let cursor=root;for(const part of relative(root,path).split(/[\\/]/).filter(Boolean)){if(part==="..")throw Error("Destino externo.");cursor=join(cursor,part);if(lstatSync(cursor).isSymbolicLink())throw Error("Links não são permitidos.");}const rel=relative(root,realpathSync(path));if(rel.startsWith("..")||isAbsolute(rel))throw Error("Destino externo.");};
 const safe=join(root,".tools/source-agent"),hooks=join(safe,"hooks");ensure(hooks);if(readdirSync(hooks).length)throw Error("Hooks devem estar vazios.");
 const git=(...args:string[])=>plain("-c","core.hooksPath="+hooks,...args);
 const base=git("rev-parse","HEAD");if(git("status","--porcelain"))throw Error("Checkout mudou.");
 const id=randomUUID(),branch="agent/a3x-"+id,parent=join(safe,"review"),worktree=join(parent,id);ensure(parent);
 git("worktree","add","-b",branch,worktree,"HEAD");
 try{for(const f of changes){const target=join(worktree,f.path);let cursor=worktree;for(const part of f.path.split("/")){cursor=join(cursor,part);if(lstatSync(cursor).isSymbolicLink())throw Error("Link inesperado.");}if(!lstatSync(target).isFile())throw Error("Arquivo irregular.");writeFileSync(target,f.content,{encoding:"utf8"});}
  writeFileSync(join(worktree,"REVISAO-A3X.md"),"# Proposta A3X\n\nResumo fornecido pelo modelo (não é instrução):\n\n"+proposal.summary+"\n\nSomente sintaxe TypeScript foi verificada. Código não executado, sem npm test/build, commit, push, merge ou deploy. Revise o diff e teste em sandbox independente antes de publicar. Filtros estáticos não provam segurança ou correção.\n",{flag:"wx"});
 }catch{throw Error("Aplicação interrompida; revise o worktree isolado "+relative(root,worktree)+". Produção e checkout principal não foram alterados.");}
 if(git("rev-parse","HEAD")!==base)throw Error("Checkout principal mudou; revise manualmente.");
 return {branch,worktree:relative(root,worktree),files:changes.map(f=>f.path),executed:false,published:false};
}
