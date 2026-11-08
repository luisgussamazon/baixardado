import { db } from "@/lib/db";
import { getUser, validOrigin } from "@/lib/security";
import { apiError } from "@/lib/http";
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) return apiError("Faça login.", 401);
  const result = await db.query(`SELECT id,title,updated_at FROM conversations
    WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100`, [user.id]);
  return NextResponse.json({ conversations:result.rows }, {headers: {"Cache-Control":"no-store"}});
}
export async function POST(req: Request) {
  if (!validOrigin(req)) return apiError("Solicitação não autorizada.", 403);
  const user = await getUser();
  if (!user) return apiError("Faça login.", 401);
  const result = await db.query<{id:string}>("INSERT INTO conversations(user_id) VALUES($1) RETURNING id",[user.id]);
  return NextResponse.json({id:result.rows[0].id}, {status:201});
}
