import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getUser,validOrigin} from "@/lib/security";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
import {browserPageUrl} from "@/lib/browser-policy";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(){try{const user=await getUser();if(!user)return apiError("Faça login.",401);
 await db.query("DELETE FROM browser_devices WHERE user_id=$1 AND expires_at<NOW()",[user.id]);
 await db.query("UPDATE browser_devices SET observation=NULL WHERE user_id=$1 AND observed_at<NOW()-INTERVAL '30 minutes' AND observation IS NOT NULL",[user.id]);
 const devices=await db.query("SELECT id,last_seen,expires_at,CASE WHEN observed_at>NOW()-INTERVAL '30 minutes' THEN observation ELSE NULL END observation,observed_at,last_seen>NOW()-INTERVAL '90 seconds' online FROM browser_devices WHERE user_id=$1 AND expires_at>NOW() ORDER BY created_at DESC",[user.id]);
 const commands=await db.query("SELECT c.id,c.status,c.url,c.expires_at FROM browser_commands c JOIN browser_devices d ON d.id=c.device_id WHERE d.user_id=$1 AND c.created_at>NOW()-INTERVAL '10 minutes' ORDER BY c.created_at DESC LIMIT 10",[user.id]);
 return NextResponse.json({devices:devices.rows,commands:commands.rows},{headers});
 }catch{return apiError("Navegador indisponível.",503);}}
export async function POST(req:Request){try{
 if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
 const user=await getUser();if(!user)return apiError("Faça login.",401);
 const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
 if(b.action==="approve"){
  if(Object.keys(b).some(k=>!["action","code","confirmed"].includes(k))||b.confirmed!==true||typeof b.code!=="string"||! /^[A-F0-9]{12}$/.test(b.code))return apiError("Confira o código e autorize a conexão.");
  const c=await db.connect();try{await c.query("BEGIN");await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,87537))",[user.id]);
   const pair=await c.query<{token_hash:string}>("DELETE FROM browser_pairings WHERE user_code=$1 AND expires_at>NOW() RETURNING token_hash",[b.code]);
   if(!pair.rows.length){await c.query("ROLLBACK");return apiError("Código expirado ou já utilizado.",404);}
   const count=await c.query<{n:number}>("SELECT COUNT(*)::int n FROM browser_devices WHERE user_id=$1 AND expires_at>NOW()",[user.id]);
   if(count.rows[0].n>=2){await c.query("ROLLBACK");return apiError("Revogue uma conexão antes de adicionar outra.",429);}
   await c.query("INSERT INTO browser_devices(user_id,token_hash) VALUES($1,$2)",[user.id,pair.rows[0].token_hash]);await c.query("COMMIT");return NextResponse.json({ok:true},{headers});
  }catch{await c.query("ROLLBACK").catch(()=>{});throw Error("pair");}finally{c.release();}
 }
 if(typeof b.id!=="string"||!isUuid(b.id))return apiError("Conexão inválida.");
 if(b.action==="revoke"&&Object.keys(b).every(k=>["action","id"].includes(k))){
  const r=await db.query("DELETE FROM browser_devices WHERE id=$1 AND user_id=$2 RETURNING id",[b.id,user.id]);return r.rows.length?NextResponse.json({ok:true},{headers}):apiError("Conexão não encontrada.",404);
 }
 if(b.action==="navigate"&&Object.keys(b).every(k=>["action","id","url","confirmed"].includes(k))&&b.confirmed===true){
  const url=browserPageUrl(b.url);if(!url)return apiError("Página fora da lista de navegação permitida.");
  // Bloqueio por dispositivo + quota para impedir crescimento irrestrito da fila.
  const c=await db.connect();try{await c.query("BEGIN");const own=await c.query("SELECT id FROM browser_devices WHERE id=$1 AND user_id=$2 AND expires_at>NOW() AND last_seen>NOW()-INTERVAL '90 seconds' FOR UPDATE",[b.id,user.id]);
   if(!own.rows.length){await c.query("ROLLBACK");return apiError("Conecte a extensão no navegador.",409);}
   await c.query("DELETE FROM browser_commands WHERE device_id=$1 AND expires_at<NOW()",[b.id]);
   const pending=await c.query("SELECT id FROM browser_commands WHERE device_id=$1 AND status IN ('pending','claimed')",[b.id]);if(pending.rows.length){await c.query("ROLLBACK");return apiError("Há uma navegação em andamento.",409);}
   await c.query("DELETE FROM browser_commands WHERE device_id=$1 AND status IN ('done','failed')",[b.id]);
   await c.query("INSERT INTO browser_commands(device_id,url) VALUES($1,$2)",[b.id,url]);await c.query("COMMIT");return NextResponse.json({ok:true},{headers});
  }catch{await c.query("ROLLBACK").catch(()=>{});throw Error("queue");}finally{c.release();}
 }
 return apiError("Ação inválida.");
 }catch{return apiError("Não foi possível concluir a solicitação.",503);}}
