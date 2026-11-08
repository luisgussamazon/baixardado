import { destroySession, validOrigin } from "@/lib/security";
import { apiError } from "@/lib/http";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!validOrigin(req)) return apiError("Solicitação não autorizada.", 403);
  await destroySession();
  return NextResponse.json({ok:true});
}
