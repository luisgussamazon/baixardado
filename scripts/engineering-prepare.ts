import {readFileSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {join} from "node:path";
import {validateAutonomousChanges} from "./autonomy-safety";
import {applyLocalSourceProposal} from "./source-worktree";
import type {SourceProposal} from "../lib/source-policy";
try{
 const run=JSON.parse(readFileSync(".autonomy/run.json","utf8"));const proposal=run.proposal as SourceProposal;
 if(!/^[a-f0-9-]{36}$/.test(run.id)||run.status!=="ready")throw Error("Manifest invalid");
 const files=proposal.files.map(f=>{if(!/^[a-zA-Z0-9_./-]+$/.test(f.path)||f.path.includes(".."))throw Error("Path invalid");return {path:f.path,sha:execFileSync("git",["rev-parse","HEAD:"+f.path],{encoding:"utf8"}).trim(),content:execFileSync("git",["show","HEAD:"+f.path],{encoding:"utf8",maxBuffer:60000})};});
 validateAutonomousChanges(proposal,files);const applied=applyLocalSourceProposal(process.cwd(),proposal);
 const changed=applied.files.map(path=>({path,hash:createHash("sha256").update(readFileSync(join(applied.worktree,path))).digest("hex")}));
 writeFileSync(".autonomy/validated.json",JSON.stringify({id:run.id,base:process.env.GITHUB_SHA,worktree:applied.worktree,files:changed}));
 console.log("Static policy accepted. Isolated branch prepared; execution still pending.");
}catch{console.error("Static preparation rejected. No generated code executed.");process.exitCode=1;}
