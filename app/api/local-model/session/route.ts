import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getDevice} from "@/lib/model-device";
import {validOrigin} from "@/lib/security";
import {apiError,isJson,parseJson} from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
  try{
    if(process.env.LOCAL_MODEL_BRIDGE==="0")return apiError("Ponte desativada.",503);
    if(!isJson(req)||(req.headers.has("origin")&&!validOrigin(req)))return apiError("Origem inválida.",403);
    const body=await parseJson(req);if(!body||body.action!=="resume"||Object.keys(body).length!==1)return apiError("Dados inválidos.");
    const device=await getDevice(req);if(!device)return apiError("Computador revogado ou não autorizado.",401);
    // Revalidar na escrita impede restaurar acesso depois de uma revogação concorrente.
    const resumed=await db.query("UPDATE local_model_devices SET last_seen=NOW() WHERE id=$1 AND user_id=$2 AND (remembered OR expires_at>NOW()) RETURNING remembered",[device.id,device.user_id]);
    if(!resumed.rowCount)return apiError("Computador revogado.",401);
    return NextResponse.json({ok:true,remembered:device.remembered},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Reconexão temporariamente indisponível.",503);}
}
