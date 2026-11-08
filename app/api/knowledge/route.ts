import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { validateKnowledge } from "@/lib/knowledge-validation";
import { validOrigin } from "@/lib/security";
import { isJson, parseJson } from "@/lib/http";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/security";
import { apiError } from "@/lib/http";
import { searchKnowledge } from "@/lib/knowledge-search";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
  try{
    const user=await getUser();
    if(!user)return apiError("Faça login.",401);
    const query=new URL(req.url).searchParams.get("q");
    if(query===null){
      const result=await db.query(`SELECT id,topic,title,question,answer,keywords,source_url,created_at,updated_at FROM knowledge_entries WHERE owner_user_id=$1 ORDER BY updated_at DESC LIMIT 150`,[user.id]);
      return NextResponse.json({entries:result.rows},{headers:{"Cache-Control":"private, no-store"}});
    }
    if(!query||!query.trim()||query.length>4000||query.includes("\0"))return apiError("Informe uma pesquisa de até 4.000 caracteres.");
    return NextResponse.json({hits:await searchKnowledge(query,user.id,5),mode:"text-search"},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível consultar a base de conhecimento.",503);}
}

export async function POST(req:Request){
  try{
    if(!validOrigin(req)||!isJson(req))return apiError("Solicitação não autorizada.",403);
    const user=await getUser();if(!user)return apiError("Faça login.",401);
    const input=validateKnowledge(await parseJson(req));
    if(!input)return apiError("Confira o título, pergunta, resposta, tema e palavras-chave (até 10).",400);
    const client=await db.connect();
    try{
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 87531))",[user.id]);
      const count=await client.query<{total:number}>(`SELECT COUNT(*)::int AS total FROM knowledge_entries WHERE owner_user_id=$1`,[user.id]);
      if(count.rows[0].total>=150){await client.query("ROLLBACK");return apiError("Limite de 150 conhecimentos. Revise ou exclua um item.",429);}
      const id=`user:${randomUUID()}`;
      const result=await client.query(`INSERT INTO knowledge_entries
        (id,owner_user_id,topic,title,question,answer,keywords,source_url,content_origin,language)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'user_owned','pt-BR')
        RETURNING id,topic,title,question,answer,keywords,source_url,created_at,updated_at`,
        [id,user.id,input.topic,input.title,input.question,input.answer,input.keywords,input.source_url]);
      await client.query("COMMIT");
      return NextResponse.json({entry:result.rows[0]},{status:201,headers:{"Cache-Control":"no-store"}});
    }catch{
      await client.query("ROLLBACK").catch(()=>{});
      throw new Error("Falha na gravação.");
    }finally{client.release();}
  }catch{return apiError("Não foi possível salvar. Confira a configuração do banco.",503);}
}
