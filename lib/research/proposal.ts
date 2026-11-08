import { validatePolicy,LABELS,type Policy } from "./classifier";
export const POLICY_TARGET="config/research-policy.ts";
export function renderPolicy(policy:Policy){
  validatePolicy(policy);
  return '// Política experimental OFFLINE. Não é importada pelo Chat.\nimport type { Policy } from "../lib/research/classifier";\nexport const RESEARCH_POLICY:Policy = '+JSON.stringify(policy,null,2)+';\n';
}
export function validateCandidate(baseline:Policy,candidate:unknown):asserts candidate is Policy{
  validatePolicy(baseline);validatePolicy(candidate);
  if(candidate.version!==baseline.version+1)throw new Error("Versão candidata incompatível.");
  let added=0;
  for(const label of LABELS){
    const before=baseline.intents[label],after=candidate.intents[label];
    if(JSON.stringify(before.phrases)!==JSON.stringify(after.phrases)||after.tokens.length<before.tokens.length||after.tokens.length>before.tokens.length+3||before.tokens.some((word,i)=>after.tokens[i]!==word))throw new Error("Proposta modifica regras fora do escopo.");
    for(const word of after.tokens.slice(before.tokens.length)){if(!/^[a-z0-9+#.-]{3,65}$/.test(word)||before.tokens.includes(word))throw new Error("Palavra candidata inválida.");added++;}
    if(new Set(after.tokens).size!==after.tokens.length)throw new Error("Palavras duplicadas.");
  }
  if(!added||added>24)throw new Error("Quantidade de mudanças inválida.");
}
export function policyPatch(original:string,candidate:Policy){
  const next=renderPolicy(candidate),before=original.replace(/\r\n/g,"\n").trimEnd().split("\n"),after=next.trimEnd().split("\n");
  return `diff --git a/${POLICY_TARGET} b/${POLICY_TARGET}\n--- a/${POLICY_TARGET}\n+++ b/${POLICY_TARGET}\n@@ -1,${before.length} +1,${after.length} @@\n`+before.map(line=>"-"+line).join("\n")+"\n"+after.map(line=>"+"+line).join("\n")+"\n";
}
