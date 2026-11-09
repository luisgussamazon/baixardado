import type { MemoryRecord } from "./types";
import { normalize } from "./interpret";
export const CREATOR_LABEL="Criador do A3X AI";
export function institutionQuestion(message:string){return /^(?:quem (?:te criou|criou voce|criou (?:o |a )?a3x(?: ai| ia)?|(?:e|sao) (?:o |os )?(?:seu criador|seus criadores|criador(?:es)? (?:do|da) a3x(?: ai| ia)?)|fundou (?:a )?a3x tech)|(?:quem (?:e|sao)|quais sao) (?:o |os )?fundadores (?:da )?a3x(?: tech)?)[.!? ]*$/.test(normalize(message));}
export function isCreatorLabel(label:string){return normalize(label)===normalize(CREATOR_LABEL);}
export function validCreatorName(name:string){return name===name.trim()&&name.length<=80&&/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._'’-]{0,79}$/u.test(name);}
export function creatorProfile(records:readonly MemoryRecord[]){
  const matches=records.filter(record=>record.kind==="fact"&&record.status==="approved"&&isCreatorLabel(record.label)&&validCreatorName(record.value));
  // Perfis conflitantes exigem revisão, em vez de assumir silenciosamente um nome.
  if(new Set(matches.map(record=>record.value)).size!==1)return null;
  return matches[0]?{name:matches[0].value,sourceId:matches[0].id}:null;
}
export function creatorQuestion(message:string){
  return /^(?:quem (?:te criou|criou voce|criou (?:o )?a3x(?: ai)?|e (?:o )?seu criador|e o criador do a3x(?: ai)?|sou eu)|voce (?:me reconhece|sabe (?:quem (?:eu )?sou|quem e (?:o )?seu criador|que (?:eu )?sou (?:o )?seu criador))|eu sou (?:o )?seu criador)[.!? ]*$/.test(normalize(message));
}
