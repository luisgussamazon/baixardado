import {db} from "@/lib/db";
import {getUser} from "@/lib/security";
import {apiError,isUuid} from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{const user=await getUser();if(!user)return apiError("Faça login.",401);const {id}=await params;if(!isUuid(id))return apiError("Proposta inválida.");const r=await db.query("SELECT proposal FROM source_proposals WHERE id=$1 AND user_id=$2 AND status='ready'",[id,user.id]);if(!r.rows[0])return apiError("Proposta não encontrada.",404);return new Response(JSON.stringify(r.rows[0].proposal,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="a3x-proposta-${id}.json"`,"Cache-Control":"private, no-store"}});}catch{return apiError("Proposta indisponível.",503);}}
