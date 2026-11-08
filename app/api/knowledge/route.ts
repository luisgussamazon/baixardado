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
    if(!query||!query.trim()||query.length>4000||query.includes("\0"))return apiError("Informe uma pesquisa de até 4.000 caracteres.");
    return NextResponse.json({hits:await searchKnowledge(query,user.id,5),mode:"text-search"},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch{return apiError("Não foi possível consultar a base de conhecimento.",503);}
}
