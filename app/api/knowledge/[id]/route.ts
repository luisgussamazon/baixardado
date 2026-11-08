import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, isJson, parseJson, isUuid } from "@/lib/http";
import { getUser, validOrigin } from "@/lib/security";
import { validateKnowledge } from "@/lib/knowledge-validation";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Ctx={params:Promise<{id:string}>};
function validId(id:string){return id.startsWith("user:") && isUuid(id.slice(5));}
export async function PATCH(req:Request,{params}:Ctx){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const {id}=await params;if(!validId(id))return apiError("Identificador inválido.",400);
    const x=validateKnowledge(await parseJson(req));if(!x)return apiError("Dados inválidos.",400);
    const result=await db.query(`UPDATE knowledge_entries SET topic=$3,title=$4,question=$5,answer=$6,
      keywords=$7,source_url=$8,updated_at=NOW() WHERE id=$1 AND owner_user_id=$2
      RETURNING id,topic,title,question,answer,keywords,source_url,created_at,updated_at`,
      [id,user.id,x.topic,x.title,x.question,x.answer,x.keywords,x.source_url]);
    if(!result.rowCount)return apiError("Conhecimento não encontrado.",404);
    return NextResponse.json({entry:result.rows[0]},{headers:{"Cache-Control":"no-store"}});
  }catch{return apiError("Não foi possível atualizar.",503);}
}
export async function DELETE(req:Request,{params}:Ctx){
  try{
    if(!validOrigin(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const {id}=await params;if(!validId(id))return apiError("Identificador inválido.",400);
    const result=await db.query(`DELETE FROM knowledge_entries WHERE id=$1 AND owner_user_id=$2 RETURNING id`,[id,user.id]);
    if(!result.rowCount)return apiError("Conhecimento não encontrado.",404);
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch{return apiError("Não foi possível excluir.",503);}
}
