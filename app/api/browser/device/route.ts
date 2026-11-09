import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
import {browserDevice} from "@/lib/browser-device";
import {validateObservation} from "@/lib/browser-policy";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){try{
 if(!isJson(req))return apiError("Solicitação inválida.",403);
 const d=await browserDevice(req);if(!d)return apiError("Autorize a extensão na sua conta A3X.",401);
 const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
 await db.query("UPDATE browser_devices SET last_seen=NOW(),observation=CASE WHEN observed_at>NOW()-INTERVAL '30 minutes' THEN observation ELSE NULL END WHERE id=$1",[d.id]);
 const headers={"Cache-Control":"private, no-store"};
 if(b.action==="poll"&&Object.keys(b).length===1){
  const command=await db.query("UPDATE browser_commands SET status='claimed' WHERE id=(SELECT id FROM browser_commands WHERE device_id=$1 AND status='pending' AND expires_at>NOW() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) AND status='pending' RETURNING id,url",[d.id]);
  return NextResponse.json({command:command.rows[0]??null},{headers});
 }
 if(b.action==="complete"&&Object.keys(b).every(k=>["action","id","ok"].includes(k))&&typeof b.id==="string"&&isUuid(b.id)&&typeof b.ok==="boolean"){
  const r=await db.query("UPDATE browser_commands SET status=$3 WHERE id=$1 AND device_id=$2 AND status='claimed' AND expires_at>NOW() RETURNING id",[b.id,d.id,b.ok?"done":"failed"]);
  return r.rows.length?NextResponse.json({ok:true},{headers}):apiError("Comando expirado ou indisponível.",404);
 }
 if(b.action==="observe"&&b.confirmed===true&&Object.keys(b).every(k=>["action","confirmed","observation"].includes(k))){
  const observation=validateObservation(b.observation);if(!observation)return apiError("Revise a captura. Login, dados sensíveis ou página externa não são aceitos.");
  await db.query("UPDATE browser_devices SET observation=$2::jsonb,observed_at=NOW() WHERE id=$1",[d.id,JSON.stringify(observation)]);
  return NextResponse.json({ok:true},{headers});
 }
 return apiError("Ação inválida.");
 }catch{return apiError("Conexão indisponível.",503);}}
