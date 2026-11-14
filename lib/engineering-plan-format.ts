import {WRITABLE_SOURCE} from "./source-policy";
import {EngineeringFailure} from "./engineering-errors";
// Responses API text.format; the server independently validates the response too.
export const ENGINEERING_PLAN_FORMAT={type:"json_schema",name:"a3x_engineering_plan",strict:true,schema:{type:"object",properties:{path:{type:"string",enum:WRITABLE_SOURCE},hypothesis:{type:"string"},criterion:{type:"string"}},required:["path","hypothesis","criterion"],additionalProperties:false}};
export function parseEngineeringPlan(raw:string,editable:readonly string[]){
 try{const p=JSON.parse(raw);if(!p||Array.isArray(p)||Object.keys(p).sort().join(",")!=="criterion,hypothesis,path"||!editable.includes(p.path)||typeof p.hypothesis!=="string"||!p.hypothesis.trim()||p.hypothesis.length>1000||typeof p.criterion!=="string"||!p.criterion.trim()||p.criterion.length>500)throw Error();return p as {path:string;hypothesis:string;criterion:string};}catch{throw new EngineeringFailure("PLAN_FORMAT");}
}
