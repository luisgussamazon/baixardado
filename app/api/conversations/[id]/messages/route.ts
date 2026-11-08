import { db } from "@/lib/db";
import { getUser } from "@/lib/security";
import { apiError, isUuid } from "@/lib/http";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(_req: Request, {params}: {params:Promise<{id:string}>}) {
  const user = await getUser();
  if (!user) return apiError("Faça login.", 401);
  const {id} = await params;
  if (!isUuid(id)) return apiError("Identificador inválido.");
  const result = await db.query(`SELECT m.id,m.role,m.content FROM messages m
    JOIN conversations c ON c.id=m.conversation_id
    WHERE c.id=$1 AND c.user_id=$2 ORDER BY m.id DESC LIMIT 200`,[id,user.id]);
  return NextResponse.json({messages:result.rows.reverse()}, {headers:{"Cache-Control":"no-store"}});
}
