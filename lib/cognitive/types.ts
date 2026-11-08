export type MemoryKind = "fact" | "preference" | "correction" | "feedback";
export type MemoryRecord = {id:string;kind:MemoryKind;label:string;value:string;question:string|null;status:"pending"|"approved";created_at?:string};
export type Goal = {title:string;phase:"planned"|"active"|"paused"|"completed"|"cancelled";step:number;steps:string[]};
export type DialogueState = {version:1;turns:number;topic:string|null;lastIntent:string;goal:Goal|null;pendingWeb:{query:string;expires:number}|null};
export type Interpretation = {intent:"memory"|"identity"|"goal"|"goal-action"|"followup"|"web"|"question";entities:{topic?:string;deadline?:string;goal?:string;action?:string}};
export type Confidence = "alta"|"moderada"|"baixa";
export type CognitiveDecision = {route:"local"|"knowledge"|"web"|"unknown";text:string;query?:string;confidence:Confidence;reason:string;state:DialogueState;interpretation:Interpretation;protected:boolean};
export const initialState = ():DialogueState=>({version:1,turns:0,topic:null,lastIntent:"start",goal:null,pendingWeb:null});
