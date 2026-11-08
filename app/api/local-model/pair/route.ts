import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError,isJson,parseJson } from "@/lib/http";
import { clientFingerprint,loginAllowed,validOrigin } from "@/lib/security";
import { bearer,tokenHash } from "@/lib/model-device";
import { LOCAL_MODEL } from "@/lib/local-model";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function POST(req:Request){
  try{
    if(process.env.LOCAL_MODEL_BRIDGE==="0")return apiError("Ponte desativada pelo servidor.",503);
    if(!isJson(req)||(req.headers.has("origin")&&!validOrigin(req)))return apiError("Solicitação inválida.",403);
    if(!await loginAllowed("model-pair:"+clientFingerprint(req))||!await loginAllowed("model-pair:global"))return apiError("Aguarde antes de tentar conectar novamente.",429);
    const input=await parseJson(req);if(!input||Object.keys(input).some(k=>k!=="model")||input.model!==LOCAL_MODEL)return apiError("Modelo local não permitido.");
    const token=randomBytes(32).toString("hex"),code=randomBytes(6).toString("hex").toUpperCase();
    await db.query("DELETE FROM local_model_pairings WHERE expires_at<NOW()");
    await db.query("INSERT INTO local_model_pairings(token_hash,user_code,model) VALUES($1,$2,$3)",[tokenHash(token),code,LOCAL_MODEL]);
    return NextResponse.json({token,code,expiresIn:600},{status:201,headers});
  }catch{return apiError("Não foi possível iniciar a conexão.",503);}
}
export async function GET(req:Request){
  try{
    const hash=bearer(req);if(!hash)return apiError("Conexão não autorizada.",401);
    const result=await db.query<{status:string}>("SELECT status FROM local_model_pairings WHERE token_hash=$1 AND expires_at>NOW()",[hash]);
    if(!result.rows[0])return apiError("Conexão expirada.",401);
    return NextResponse.json(result.rows[0],{headers});
  }catch{return apiError("Conexão indisponível.",503);}
}
