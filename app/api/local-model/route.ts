import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser,validOrigin } from "@/lib/security";
import { apiError,isJson,isUuid,parseJson } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  try{
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const result=await db.query("SELECT id,model,last_seen,expires_at,last_seen>NOW()-INTERVAL '30 seconds' AS online FROM local_model_devices WHERE user_id=$1 AND expires_at>NOW() ORDER BY created_at DESC",[user.id]);
    return NextResponse.json({devices:result.rows,enabled:process.env.LOCAL_MODEL_BRIDGE!=="0"},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível verificar o computador.",503);}
}
export async function POST(req:Request){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const body=await parseJson(req);if(!body)return apiError("Dados inválidos.");
    if(body.action==="revoke"&&typeof body.id==="string"&&isUuid(body.id)){
      if(Object.keys(body).some(key=>!["action","id"].includes(key)))return apiError("Dados inválidos.");
      const deleted=await db.query("DELETE FROM local_model_devices WHERE id=$1 AND user_id=$2 RETURNING id",[body.id,user.id]);
      if(!deleted.rowCount)return apiError("Computador não encontrado.",404);
      return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    }
    if(process.env.LOCAL_MODEL_BRIDGE==="0")return apiError("Ponte desativada pelo servidor.",503);
    if(body.action!=="approve"||body.confirmed!==true||typeof body.code!=="string"||! /^[A-F0-9]{12}$/.test(body.code)||Object.keys(body).some(key=>!["action","confirmed","code"].includes(key)))return apiError("Revise o código e confirme a autorização.");
    const client=await db.connect();
    try{
      await client.query("BEGIN");await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,87534))",[user.id]);
      const pairing=await client.query<{token_hash:string;model:string}>("SELECT token_hash,model FROM local_model_pairings WHERE user_code=$1 AND status='pending' AND expires_at>NOW() FOR UPDATE",[body.code]);
      if(!pairing.rows[0]){await client.query("ROLLBACK");return apiError("Código inválido, utilizado ou expirado.",404);}
      const count=await client.query<{total:number}>("SELECT COUNT(*)::int total FROM local_model_devices WHERE user_id=$1 AND expires_at>NOW()",[user.id]);
      if(count.rows[0].total>=3){await client.query("ROLLBACK");return apiError("Revogue uma conexão antiga antes de adicionar outra.",429);}
      await client.query("INSERT INTO local_model_devices(user_id,token_hash,model) VALUES($1,$2,$3)",[user.id,pairing.rows[0].token_hash,pairing.rows[0].model]);
      await client.query("UPDATE local_model_pairings SET status='approved' WHERE token_hash=$1",[pairing.rows[0].token_hash]);
      await client.query("COMMIT");return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    }catch{await client.query("ROLLBACK").catch(()=>{});throw new Error("Falha na autorização.");}finally{client.release();}
  }catch{return apiError("Não foi possível autorizar o computador.",503);}
}
