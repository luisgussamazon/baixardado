import { db } from "@/lib/db";
import { getUser, validOrigin } from "@/lib/security";
import { apiError, isUuid } from "@/lib/http";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function DELETE(req: Request, {params}: {params:Promise<{id:string}>}) {
  try {
    if (!validOrigin(req)) return apiError("Solicitação não autorizada.", 403);
    const user = await getUser();
    if (!user) return apiError("Faça login.", 401);
    const {id} = await params;
    if (!isUuid(id)) return apiError("Identificador inválido.");
    const result = await db.query("DELETE FROM conversations WHERE id=$1 AND user_id=$2 AND (busy_until IS NULL OR busy_until < NOW())",[id,user.id]);
    if (!result.rowCount) return apiError("Conversa indisponível ou resposta em andamento.",409);
    return NextResponse.json({ok:true});
  } catch {
    return apiError("Serviço temporariamente indisponível. Tente novamente.", 503);
  }
}
