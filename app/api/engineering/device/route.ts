import {NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {db} from "@/lib/db";
import {getUser,validOrigin,sha256,clientFingerprint,loginAllowed} from "@/lib/security";
import {apiError,isJson,isUuid,parseJson} from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(req:Request){try{
 const token=req.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];if(!token)return apiError("Dispositivo não autorizado.",401);
 const device=await db.query<{id:string;user_id:string|null}>("UPDATE engineering_devices SET last_seen=NOW() WHERE token_hash=$1 AND NOT revoked AND expires_at>NOW() RETURNING id,user_id",[sha256(token)]);if(!device.rows[0])return apiError("Conexão expirada ou revogada.",401);const owner=device.rows[0].user_id;if(!owner)return NextResponse.json({authorized:false},{headers});
 const tasks=await db.query("SELECT id,goal,status,base_sha,pr_number,proposal FROM engineering_tasks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",[owner]);return NextResponse.json({authorized:true,tasks:tasks.rows},{headers});
 }catch{return apiError("Conexão indisponível.",503);}}
export async function POST(req:Request){try{
 if(!isJson(req))return apiError("Dados inválidos.",403);const b=await parseJson(req);if(!b)return apiError("Dados inválidos.");
 if(b.action==="pair"&&Object.keys(b).length===1){if(!await loginAllowed("engineering-device:"+clientFingerprint(req)))return apiError("Aguarde para tentar novamente.",429);
  await db.query("DELETE FROM engineering_devices WHERE expires_at<NOW()");const count=await db.query<{n:number}>("SELECT COUNT(*)::int n FROM engineering_devices WHERE user_id IS NULL");if(count.rows[0].n>=100)return apiError("Pareamentos temporariamente indisponíveis.",429);
  const token=randomBytes(32).toString("base64url"),code=randomBytes(6).toString("hex").toUpperCase();await db.query("INSERT INTO engineering_devices(token_hash,code_hash) VALUES($1,$2)",[sha256(token),sha256(code)]);return NextResponse.json({token,code},{status:201,headers});
 }
 if(!validOrigin(req))return apiError("Origem inválida.",403);const user=await getUser();if(!user)return apiError("Faça login.",401);
 if(b.action==="approve"&&b.consent===true&&typeof b.code==="string"&&/^[A-F0-9]{12}$/.test(b.code)&&Object.keys(b).every(k=>["action","code","consent"].includes(k))){const count=await db.query<{n:number}>("SELECT COUNT(*)::int n FROM engineering_devices WHERE user_id=$1 AND NOT revoked AND expires_at>NOW()",[user.id]);if(count.rows[0].n>=3)return apiError("Revogue uma conexão antes de autorizar outra.",429);const r=await db.query("UPDATE engineering_devices SET user_id=$2,code_hash=NULL,authorized_at=NOW(),expires_at=NOW()+INTERVAL '8 hours' WHERE code_hash=$1 AND user_id IS NULL AND NOT revoked AND expires_at>NOW() RETURNING id",[sha256(b.code),user.id]);return r.rows.length?NextResponse.json({ok:true},{headers}):apiError("Código inválido ou expirado.",409);}
 if(b.action==="revoke"&&typeof b.id==="string"&&isUuid(b.id)&&Object.keys(b).length===2){await db.query("UPDATE engineering_devices SET revoked=TRUE WHERE id=$1 AND user_id=$2",[b.id,user.id]);return NextResponse.json({ok:true},{headers});}
 if(b.action==="list"&&Object.keys(b).length===1){const r=await db.query("SELECT id,authorized_at,last_seen,expires_at,revoked FROM engineering_devices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",[user.id]);return NextResponse.json({devices:r.rows},{headers});}
 return apiError("Ação inválida.");
 }catch{return apiError("Não foi possível conectar.",503);}}
