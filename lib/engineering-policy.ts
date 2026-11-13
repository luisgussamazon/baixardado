import {sensitiveSourceContent} from "./source-policy";
export const ENGINEERING_REPO="luisgussamazon/baixardado";
export const ENGINEERING_AGENTS=["architect","coder","tester","security","optimizer","evolution"] as const;
export type EngineeringAgent=typeof ENGINEERING_AGENTS[number];
export const ENGINEERING_MODES=["observe","develop","integration","validate"] as const;
export type EngineeringMode=typeof ENGINEERING_MODES[number];
export function newEngineeringTask(value:Record<string,unknown>){
 if(Object.keys(value).some(k=>!["action","goal","mode","consent"].includes(k))||value.action!=="create"||typeof value.goal!=="string"||!value.goal.trim()||value.goal.length>1000||!ENGINEERING_MODES.includes(value.mode as EngineeringMode)||value.consent!==true)throw Error("Confirme o objetivo, o escopo e o consentimento.");
 if(sensitiveSourceContent(value.goal))throw Error("Remova possíveis credenciais e dados pessoais do objetivo.");
 return {goal:value.goal.trim(),mode:value.mode as EngineeringMode};
}
export function canControlTask(status:string,action:string){return action==="pause"&&["queued","running"].includes(status)||action==="cancel"&&["queued","running","paused"].includes(status)||action==="resume"&&["paused","failed"].includes(status)||action==="revert"&&status==="review";}
