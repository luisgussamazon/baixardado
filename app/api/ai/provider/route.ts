import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getUser,validOrigin} from "@/lib/security";
import {apiError,isJson,parseJson} from "@/lib/http";
import {OPENAI_MODEL,openAIConfigured,openAIBudgetMicros,selectedProvider} from "@/lib/ai-provider";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  try{const user=await getUser();if(!user)return apiError("Faça login.",401);
    return NextResponse.json({provider:await selectedProvider(user.id),model:OPENAI_MODEL,available:openAIConfigured(),budgetUsd:openAIBudgetMicros()/1_000_000},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível verificar o modelo.",503);}
}
export async function POST(req:Request){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const body=await parseJson(req);
    if(!body||Object.keys(body).some(key=>!["provider","consent"].includes(key))||! ["local","openai"].includes(String(body.provider))||(body.consent!==undefined&&typeof body.consent!=="boolean"))return apiError("Configuração inválida.");
    if(body.provider==="openai"&&body.consent!==true)return apiError("Confirme o envio do contexto à OpenAI.");
    if(body.provider==="openai"&&!openAIConfigured())return apiError("A chave da OpenAI ainda não está configurada no servidor.",503);
    await db.query(`INSERT INTO ai_preferences(user_id,provider,cloud_consent_version,cloud_consented_at) VALUES($1,$2,$3,CASE WHEN $3=1 THEN NOW() ELSE NULL END)
      ON CONFLICT(user_id) DO UPDATE SET provider=EXCLUDED.provider,cloud_consent_version=EXCLUDED.cloud_consent_version,cloud_consented_at=EXCLUDED.cloud_consented_at,updated_at=NOW()`,[user.id,body.provider,body.provider==="openai"?1:0]);
    return NextResponse.json({provider:body.provider},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível alterar o modelo.",503);}
}
