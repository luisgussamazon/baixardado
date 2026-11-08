import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDevice } from "@/lib/model-device";
import { apiError,isJson,isUuid,parseJson } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
  try{
    if(process.env.LOCAL_MODEL_BRIDGE==="0")return apiError("Ponte desativada pelo servidor.",503);
    if(!isJson(req))return apiError("JSON obrigatório.");
    const device=await getDevice(req);if(!device)return apiError("Computador não autorizado.",401);
    const body=await parseJson(req);if(!body)return apiError("Dados inválidos.");
    if(body.action==="heartbeat"){
      if(Object.keys(body).some(key=>!["action","id"].includes(key))||typeof body.id!=="string"||!isUuid(body.id))return apiError("Dados inválidos.");
      await db.query("UPDATE local_model_devices SET last_seen=NOW() WHERE id=$1 AND user_id=$2",[device.id,device.user_id]);
      const active=await db.query("SELECT id FROM local_model_jobs WHERE id=$1 AND device_id=$2 AND user_id=$3 AND status='running' AND expires_at>NOW()",[body.id,device.id,device.user_id]);
      return NextResponse.json({active:active.rows.length>0},{headers:{"Cache-Control":"private, no-store"}});
    }
    if(body.action==="poll"){
      if(Object.keys(body).length!==1)return apiError("Dados inválidos.");
      await db.query("UPDATE local_model_devices SET last_seen=NOW() WHERE id=$1 AND user_id=$2",[device.id,device.user_id]);
      await db.query("DELETE FROM local_model_jobs WHERE user_id=$1 AND expires_at<NOW()",[device.user_id]);
      const result=await db.query(`WITH candidate AS (SELECT id FROM local_model_jobs WHERE device_id=$1 AND user_id=$2 AND status='queued' AND expires_at>NOW()
        AND NOT EXISTS(SELECT 1 FROM local_model_jobs WHERE device_id=$1 AND status='running') ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE local_model_jobs SET status='running' FROM candidate WHERE local_model_jobs.id=candidate.id RETURNING local_model_jobs.id,payload`,[device.id,device.user_id]);
      return NextResponse.json({job:result.rows[0]??null},{headers:{"Cache-Control":"private, no-store"}});
    }
    if(body.action!=="complete"||Object.keys(body).some(key=>!["action","id","failed","result"].includes(key))||(body.failed!==undefined&&typeof body.failed!=="boolean")||typeof body.id!=="string"||!isUuid(body.id)||!(body.failed===true||(typeof body.result==="string"&&body.result.trim()&&body.result.length<=12000)))return apiError("Resultado inválido.");
    const result=await db.query(`UPDATE local_model_jobs SET status=$4,result=$5,payload='{}'::jsonb WHERE id=$1 AND device_id=$2 AND user_id=$3 AND status='running' AND expires_at>NOW() RETURNING id`,[body.id,device.id,device.user_id,body.failed?"failed":"completed",body.failed?null:body.result]);
    if(!result.rowCount)return apiError("Solicitação expirada ou não encontrada.",404);
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Ponte temporariamente indisponível.",503);}
}
