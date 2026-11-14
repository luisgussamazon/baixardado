import {CloudAIError} from "./ai-provider";

const messages={
 AI_AUTH:"A OpenAI recusou a autenticação (401). Confira a chave no servidor.",
 AI_ACCESS:"A OpenAI recusou o acesso (403). Confira as permissões do projeto e do modelo.",
 AI_MODEL:"O modelo solicitado não foi encontrado ou não está disponível para esta conta (404).",
 AI_REQUEST:"A OpenAI recusou o contrato da requisição (400/422). A integração precisa ser revisada.",
 AI_LIMIT:"A OpenAI limitou a requisição (429). Confira saldo, quota e limites da conta.",
 AI_UNAVAILABLE:"A API ficou indisponível. Nenhuma chamada incerta foi repetida.",
 AI_TIMEOUT:"O planejamento excedeu o prazo ou foi cancelado. Nenhuma repetição automática.",
 LOCAL_BUDGET:"O teto mensal interno da API foi atingido.",
 LOCAL_CONCURRENCY:"Há chamadas da API em andamento nesta conta. Aguarde a conclusão.",
 AI_CONSENT:"Modelo ou consentimento indisponível para esta conta.",
 PLAN_FORMAT:"O modelo não retornou um plano JSON válido dentro do escopo permitido.",
 PLAN_INCOMPLETE:"A resposta do planejamento ficou incompleta ou excedeu o limite de tamanho.",
 DOT_PAUSED:"O processamento pago dos agentes DOT foi pausado.",
 DOT_CALL_LIMIT:"O limite de chamadas ou de reserva por tarefa DOT foi atingido.",
 DOT_EXPIRED:"A tarefa DOT excedeu o prazo de uma hora desde a criacao.",
 PLAN_TOOL_FINAL:"O modelo solicitou ferramenta na etapa final, em que deveria concluir o plano.",
 PLAN_TOOL_LIMIT:"O modelo excedeu o limite de chamadas ou enviou uma chamada malformada.",
 PLAN_TOOL_SCOPE:"O modelo solicitou uma ferramenta inexistente ou fora da lista autorizada.",
 PLAN_TOOLS:"O planejamento excedeu o limite ou solicitou uma ferramenta fora do escopo.",
 PLAN_CONTEXT:"O contexto de ferramentas excedeu o tamanho autorizado.",
 TASK_LEASE:"A tarefa foi pausada, cancelada ou perdeu a autorização de execução.",
 ENGINEERING_UNKNOWN:"Etapa interrompida por erro não identificado. Nenhuma publicação autorizada.",
};
export type EngineeringFailureCode=keyof typeof messages;
export class EngineeringFailure extends Error{
 constructor(public code:EngineeringFailureCode){super(messages[code]);}
}
export function providerEngineeringFailure(status:number){return new EngineeringFailure(status===401?"AI_AUTH":status===403?"AI_ACCESS":status===404?"AI_MODEL":status===429?"AI_LIMIT":[400,422].includes(status)?"AI_REQUEST":"AI_UNAVAILABLE");}
export function safeEngineeringFailure(error:unknown):EngineeringFailure{
 if(error instanceof EngineeringFailure)return new EngineeringFailure(error.code);
 if(error instanceof CloudAIError){
  if(error.message.startsWith("Teto mensal"))return new EngineeringFailure("LOCAL_BUDGET");
  if(error.message.startsWith("Há respostas"))return new EngineeringFailure("LOCAL_CONCURRENCY");
  if(error.message==="Modelo ou consentimento indisponível.")return new EngineeringFailure("AI_CONSENT");
 }
 if(error instanceof SyntaxError)return new EngineeringFailure("PLAN_FORMAT");
 if(error instanceof Error){
  if(["TimeoutError","AbortError"].includes(error.name))return new EngineeringFailure("AI_TIMEOUT");
  const known:Record<string,EngineeringFailureCode>={"Invalid plan":"PLAN_FORMAT","Proposal size invalid":"PLAN_FORMAT","Incomplete response":"PLAN_INCOMPLETE","Response too large":"PLAN_INCOMPLETE","Empty response":"PLAN_INCOMPLETE","Tool limit":"PLAN_TOOLS","Invalid tool arguments":"PLAN_TOOLS","Tool not authorized":"PLAN_TOOLS","Source outside authorized scope":"PLAN_TOOLS","Task lease unavailable":"TASK_LEASE","Preparation already claimed":"TASK_LEASE","Consent revoked":"AI_CONSENT","DOT paid execution paused":"DOT_PAUSED","DOT call limit":"DOT_CALL_LIMIT","DOT task expired":"DOT_EXPIRED","Invalid tool JSON":"PLAN_FORMAT","Invalid response JSON":"PLAN_FORMAT"};
  if(Object.hasOwn(known,error.message))return new EngineeringFailure(known[error.message]);
 }
 return new EngineeringFailure("ENGINEERING_UNKNOWN");
}
