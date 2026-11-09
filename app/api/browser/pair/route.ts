import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {apiError,isJson,parseJson} from "@/lib/http";
import {clientFingerprint,loginAllowed} from "@/lib/security";
import {tokenHash} from "@/lib/model-device";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){try{
 if(!isJson(req))return apiError("Solicitação inválida.",403);
 const body=await parseJson(req);if(!body||Object.keys(body).length)return apiError("Dados inválidos.");
 if(!await loginAllowed("browser-pair:"+clientFingerprint(req))||!await loginAllowed("browser-pair:global"))return apiError("Aguarde antes de tentar novamente.",429);
 const token=randomBytes(32).toString("hex"),code=randomBytes(6).toString("hex").toUpperCase();
 await db.query("DELETE FROM browser_pairings WHERE expires_at<NOW()");
 await db.query("DELETE FROM browser_devices WHERE expires_at<NOW()");
 await db.query("INSERT INTO browser_pairings(token_hash,user_code) VALUES($1,$2)",[tokenHash(token),code]);
 return NextResponse.json({token,code},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch{return apiError("Não foi possível iniciar a conexão.",503);}}
