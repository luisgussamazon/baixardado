import {db} from "./db";
export const OPENAI_MODEL="gpt-6-luna";
export type AIProvider="local"|"openai";
export function openAIConfigured(){return process.env.OPENAI_ENABLED!=="0"&&!!process.env.OPENAI_API_KEY?.trim();}
export function openAIBudgetMicros(){
  const value=Number(process.env.OPENAI_MONTHLY_BUDGET_USD??"5");
  if(!Number.isFinite(value)||value<=0||value>1000)throw new Error("Orçamento da API inválido.");
  return Math.floor(value*1_000_000);
}
export async function selectedProvider(userId:string):Promise<AIProvider>{
  // Falha na leitura jamais autoriza envio à nuvem.
  const result=await db.query<{provider:AIProvider}>("SELECT provider FROM ai_preferences WHERE user_id=$1 AND (provider='local' OR (cloud_consent_version=1 AND cloud_consented_at IS NOT NULL))",[userId]).catch(()=>null);
  return result?.rows[0]?.provider==="openai"?"openai":"local";
}
export class CloudAIError extends Error{constructor(message:string,public status=503){super(message);}}
export async function reserveAIUsage(userId:string,reserved:number):Promise<string>{
  const budget=openAIBudgetMicros(),client=await db.connect();
  try{
    await client.query("BEGIN");await client.query("SELECT pg_advisory_xact_lock(87536)");
    const usage=await client.query<{spent:string}>(`SELECT COALESCE(SUM(COALESCE(charged_microusd,reserved_microusd)),0)::text spent FROM ai_api_usage WHERE created_at>=(date_trunc('month',NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`);
    if(Number(usage.rows[0].spent)+reserved>budget)throw new CloudAIError("Teto mensal da API atingido. Você pode continuar no modelo do seu computador.",429);
    const active=await client.query<{total:number}>("SELECT COUNT(*)::int total FROM ai_api_usage WHERE user_id=$1 AND status='reserved' AND created_at>NOW()-INTERVAL '2 minutes'",[userId]);
    if(active.rows[0].total>=2)throw new CloudAIError("Há respostas da API em andamento. Aguarde a conclusão.",429);
    const result=await client.query<{id:string}>("INSERT INTO ai_api_usage(user_id,reserved_microusd) VALUES($1,$2) RETURNING id",[userId,reserved]);
    await client.query("COMMIT");return result.rows[0].id;
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}
export async function finishAIUsage(id:string,status:"succeeded"|"rejected"|"unknown",usage?:{input:number;output:number}){
  const charged=status==="rejected"?0:usage?Math.ceil(usage.input*.1+usage.output*.5):null;
  await db.query("UPDATE ai_api_usage SET status=$2,charged_microusd=$3,input_tokens=$4,output_tokens=$5,finished_at=NOW() WHERE id=$1 AND status='reserved'",[id,status,charged,usage?.input??null,usage?.output??null]);
}
