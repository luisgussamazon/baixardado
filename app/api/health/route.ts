import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  let ready = false;
  if (process.env.DATABASE_URL) {
    try {
      const result = await db.query<{ready:boolean}>(`SELECT
        to_regclass('browser_devices') IS NOT NULL AND to_regclass('browser_commands') IS NOT NULL AND to_regclass('browser_pairings') IS NOT NULL AND to_regclass('ai_preferences') IS NOT NULL AND to_regclass('ai_api_usage') IS NOT NULL AND to_regclass('users') IS NOT NULL AND to_regclass('sessions') IS NOT NULL AND
        to_regclass('conversations') IS NOT NULL AND to_regclass('messages') IS NOT NULL AND
        to_regclass('daily_usage') IS NOT NULL AND to_regclass('login_attempts') IS NOT NULL AND
        to_regclass('programmer_projects') IS NOT NULL AND
        to_regclass('knowledge_entries') IS NOT NULL AND
        to_regclass('cognitive_records') IS NOT NULL AND
        to_regclass('cognitive_dialogue_states') IS NOT NULL AND
        to_regclass('autonomous_study_notes') IS NOT NULL AND to_regclass('autonomous_study_state') IS NOT NULL AND to_regclass('autonomous_study_runs') IS NOT NULL AND to_regclass('local_model_devices') IS NOT NULL AND to_regclass('local_model_jobs') IS NOT NULL AND
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='local_model_devices' AND column_name='remembered') AS ready`);
      ready = result.rows[0]?.ready === true;
    } catch { /* Não expor configuração ou detalhes de conexão no endpoint público. */ }
  }
  return NextResponse.json({ ok: ready, service: "a3x-ai" }, {
    status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}
