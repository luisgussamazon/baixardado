import { classify,LABELS,tokens,normalize,validatePolicy,type Policy,type Case,type Label } from "./classifier";
export type Dataset={train:Case[];validation:Case[];holdout:Case[];guardrails:Case[]};
export const LIMITS={maxCasesPerPartition:256,maxTotalCases:512,maxNewPerIntent:3,maxProposals:1,wallTimeMs:10000,workerHeapMb:256,networkCalls:0,toolCalls:0,executesGeneratedCode:false,automaticDeployment:false} as const;
const partitions=["train","validation","holdout","guardrails"] as const;
export function validateDataset(input:unknown):asserts input is Dataset{
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(key=>!partitions.includes(key as typeof partitions[number])))throw new Error("Conjunto inválido.");
  const dataset=input as Dataset;let total=0;
  const seen=new Set<string>();
  for(const partition of partitions){
    const part=dataset[partition];
    if(!Array.isArray(part)||!part.length||part.length>LIMITS.maxCasesPerPartition)throw new Error("Partição ausente ou acima do limite.");
    total+=part.length;
    for(const item of part){
      if(!item||Object.keys(item).some(key=>!["text","intent"].includes(key))||typeof item.text!=="string"||!item.text.trim()||item.text.length>(partition==="guardrails"?5000:4000)||![...LABELS,"clarify"].includes(item.intent))throw new Error("Caso inválido.");
      if(partition!=="guardrails"){
        const key=normalize(item.text);if(seen.has(key))throw new Error("Vazamento de exemplo entre partições.");seen.add(key);
      }
    }
  }
  if(total>LIMITS.maxTotalCases)throw new Error("Conjunto acima do limite.");
}
export function wilson(correct:number,total:number):[number,number]{
  if(!total)return [0,1];const z=1.959963984540054,p=correct/total,d=1+z*z/total;
  const center=(p+z*z/(2*total))/d,half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [Number(Math.max(0,center-half).toFixed(4)),Number(Math.min(1,center+half).toFixed(4))];
}
export function evaluate(policy:Policy,cases:Case[],check=()=>{}){
  validatePolicy(policy);const confusion:Record<string,Record<string,number>>={},mistakes:{index:number;expected:string;actual:string}[]=[];
  const predictions:string[]=[];let correct=0;
  for(const [index,item] of cases.entries()){
    check();const predicted=classify(item.text,policy).intent;predictions.push(predicted);
    confusion[item.intent]??={};confusion[item.intent][predicted]=(confusion[item.intent][predicted]??0)+1;
    if(predicted===item.intent)correct++;else mistakes.push({index,expected:item.intent,actual:predicted});
  }
  return {total:cases.length,correct,accuracy:cases.length?Number((correct/cases.length).toFixed(4)):0,wilson95:wilson(correct,cases.length),mistakes,confusion,predictions};
}
export function proposePolicy(baseline:Policy,train:Case[],check=()=>{}){
  validatePolicy(baseline);const policy=structuredClone(baseline);policy.version++;
  const vocabulary=new Map<string,Partial<Record<Label,number>>>();
  for(const item of train){
    check();if(!LABELS.includes(item.intent as Label))continue;
    for(const word of tokens(item.text)){const counts=vocabulary.get(word)??{};const label=item.intent as Label;counts[label]=(counts[label]??0)+1;vocabulary.set(word,counts);}
  }
  const mistakes=evaluate(baseline,train,check).mistakes;const changes:{intent:Label;keyword:string}[]=[];
  for(const label of LABELS){
    const deficits=new Map<string,number>();
    for(const mistake of mistakes.filter(item=>item.expected===label)){
      check();for(const word of tokens(train[mistake.index].text)){
        if(policy.intents[label].tokens.includes(word)||Object.keys(vocabulary.get(word)??{}).some(other=>other!==label))continue;
        deficits.set(word,(deficits.get(word)??0)+1);
      }
    }
    const ranked=[...deficits].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    for(const [word] of ranked.filter(([word])=>Object.values(vocabulary.get(word)??{}).reduce((a,b)=>a+(b??0),0)>=2).slice(0,LIMITS.maxNewPerIntent)){
      if(policy.intents[label].tokens.length>=50)break;
      if(!policy.intents[label].tokens.some(term=>normalize(term)===word)){policy.intents[label].tokens.push(word);changes.push({intent:label,keyword:word});}
    }
  }
  validatePolicy(policy);return {policy,changes};
}
export function pairedComparison(cases:Case[],original:string[],candidate:string[]){
  let improved=0,regressed=0;
  for(const [i,item] of cases.entries()){
    if(original[i]!==item.intent&&candidate[i]===item.intent)improved++;
    if(original[i]===item.intent&&candidate[i]!==item.intent)regressed++;
  }
  const n=improved+regressed;let probability=2**(-n),sum=probability;
  for(let k=1;k<=Math.min(improved,regressed);k++){probability*=((n-k+1)/k);sum+=probability;}
  return {improved,regressed,exactMcNemarP:n?Math.min(1,2*sum):1};
}
export function runStudy(input:unknown,policyInput:unknown,budgetMs:number=LIMITS.wallTimeMs){
  const start=performance.now();const check=()=>{if(performance.now()-start>budgetMs)throw new Error("Tempo do estudo excedido.");};
  validateDataset(input);validatePolicy(policyInput);check();
  const baseline=policyInput,dataset=input;
  const original={train:evaluate(baseline,dataset.train,check),validation:evaluate(baseline,dataset.validation,check),guardrails:evaluate(baseline,dataset.guardrails,check)};
  const {policy,changes}=proposePolicy(baseline,dataset.train,check);
  const candidate={train:evaluate(policy,dataset.train,check),validation:evaluate(policy,dataset.validation,check),guardrails:evaluate(policy,dataset.guardrails,check)};
  const safetyPreserved=candidate.guardrails.correct===dataset.guardrails.length&&original.guardrails.predictions.every((prediction,i)=>prediction!==dataset.guardrails[i].intent||candidate.guardrails.predictions[i]===prediction);
  // Congela a seleção ANTES de avaliar holdout. Holdout jamais seleciona vocabulário/candidatos.
  const selectedForHumanReview=changes.length>0&&candidate.validation.correct>original.validation.correct&&candidate.train.correct>=original.train.correct&&safetyPreserved;
  const originalHoldout=evaluate(baseline,dataset.holdout,check),candidateHoldout=evaluate(policy,dataset.holdout,check);
  return {study:"A3X Autonomia Científica v1",scope:"classificador offline de tópicos; não é a acurácia do Chat",limits:LIMITS,
    hypotheses:{H0:"não há melhoria sustentada em dados independentes",H1:"ajuste de vocabulário generaliza sem regressão de segurança"},
    original:{...original,holdout:originalHoldout},candidate:{...candidate,holdout:candidateHoldout},
    paired:{validation:pairedComparison(dataset.validation,original.validation.predictions,candidate.validation.predictions),holdout:pairedComparison(dataset.holdout,originalHoldout.predictions,candidateHoldout.predictions)},
    changes,decision:{selectedForHumanReview,safetyPreserved,holdoutNotWorse:candidateHoldout.correct>=originalHoldout.correct,generalizationDemonstrated:false,
      note:"Seleção usa treino/validação/controles. Holdout apenas relata generalização. Dados sintéticos autorais; nenhuma autorização de aplicação."},proposedPolicy:policy};
}
