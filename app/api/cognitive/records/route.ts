import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, validOrigin } from "@/lib/security";
import { apiError, isJson, parseJson } from "@/lib/http";
import { validateRecord } from "@/lib/cognitive/validation";
import { CREATOR_LABEL } from "@/lib/cognitive/creator";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const result=await db.query(`SELECT id,kind,label,value,question,status,created_at,approved_at FROM cognitive_records WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200`,[user.id]);
    return NextResponse.json({records:result.rows},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível carregar sua memória.",503);}
}
export async function POST(req:Request){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const input=validateRecord(await parseJson(req));if(!input)return apiError("Confira os campos, tamanhos e remova credenciais.");
    const client=await db.connect();
    try{
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 87532))",[user.id]);
      if(input.label===CREATOR_LABEL){
        const existing=await client.query("SELECT id FROM cognitive_records WHERE user_id=$1 AND label=$2 LIMIT 1",[user.id,CREATOR_LABEL]);
        if(existing.rows.length){await client.query("ROLLBACK");return apiError("Já existe um perfil de criador nesta conta. Aprove o pendente ou exclua o anterior para alterar.",409);}
      }
      const count=await client.query<{total:number}>("SELECT COUNT(*)::int total FROM cognitive_records WHERE user_id=$1",[user.id]);
      if(count.rows[0].total>=200){await client.query("ROLLBACK");return apiError("Limite de 200 registros. Exclua itens antes de propor novos.",429);}
      const result=await client.query(`INSERT INTO cognitive_records(user_id,kind,label,value,question) VALUES($1,$2,$3,$4,$5) RETURNING id,kind,label,value,question,status`,[user.id,input.kind,input.label,input.value,input.question]);
      await client.query("COMMIT");
      return NextResponse.json({record:result.rows[0]},{status:201,headers:{"Cache-Control":"private, no-store"}});
    }catch{await client.query("ROLLBACK").catch(()=>{});throw new Error("Falha ao propor registro.");}finally{client.release();}
  }catch{return apiError("Não foi possível propor o registro.",503);}
}
