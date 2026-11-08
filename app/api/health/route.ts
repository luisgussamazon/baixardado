import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  let ready = false;
  if (process.env.DATABASE_URL) {
    try {
      const result = await db.query<{ready:boolean}>(`SELECT
        to_regclass('users') IS NOT NULL AND to_regclass('sessions') IS NOT NULL AND
        to_regclass('conversations') IS NOT NULL AND to_regclass('messages') IS NOT NULL AND
        to_regclass('daily_usage') IS NOT NULL AND to_regclass('login_attempts') IS NOT NULL AND
        to_regclass('programmer_projects') IS NOT NULL AS ready`);
      ready = result.rows[0]?.ready === true;
    } catch { /* Não expor configuração ou detalhes de conexão no endpoint público. */ }
  }
  return NextResponse.json({ ok: ready, service: "a3x-ai" }, {
    status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}
