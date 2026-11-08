import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, validOrigin } from "@/lib/security";
import { apiError, isJson, isUuid, parseJson } from "@/lib/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Context){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const {id}=await params,body=await parseJson(req);
    if(!isUuid(id)||!body||Object.keys(body).length!==1||body.action!=="approve")return apiError("Aprovação explícita necessária.");
    const result=await db.query(`UPDATE cognitive_records SET status='approved',approved_at=COALESCE(approved_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING id,status`,[id,user.id]);
    if(!result.rowCount)return apiError("Registro não encontrado.",404);
    return NextResponse.json({record:result.rows[0]},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível aprovar.",503);}
}
export async function DELETE(req:Request,{params}:Context){
  try{
    if(!validOrigin(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const {id}=await params;if(!isUuid(id))return apiError("Identificador inválido.");
    const result=await db.query("DELETE FROM cognitive_records WHERE id=$1 AND user_id=$2 RETURNING id",[id,user.id]);
    if(!result.rowCount)return apiError("Registro não encontrado.",404);
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível excluir.",503);}
}
