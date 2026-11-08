import { db } from "@/lib/db";
import { apiError, isJson, parseJson } from "@/lib/http";
import { createSession, hashPassword, loginAllowed, clientFingerprint, validEmail, validOrigin, validPassword, safeSecretMatch } from "@/lib/security";
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!validOrigin(req) || !isJson(req)) return apiError("Solicitação não autorizada.", 403);
  if (!await loginAllowed("setup:" + clientFingerprint(req))) return apiError("Muitas tentativas. Tente mais tarde.", 429);
  const data = await parseJson(req);
  if (!data || !validEmail(data.email) || !validPassword(data.password) || typeof data.setupKey !== "string")
    return apiError("Informe e-mail, senha de 12 a 128 caracteres e chave de configuração.");
  const configured = process.env.BOOTSTRAP_SECRET ?? "";
  if (configured.length < 24 || !safeSecretMatch(data.setupKey, configured)) return apiError("Chave de configuração inválida.", 403);
  const client = await db.connect();
  let id = "";
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(9856314)");
    const count = await client.query("SELECT 1 FROM users LIMIT 1");
    if (count.rowCount) {await client.query("ROLLBACK"); return apiError("A conta inicial já foi criada.", 409);}
    const hashed = await hashPassword(data.password);
    const created = await client.query<{id: string}>(`INSERT INTO users(email,password_hash)
      VALUES($1,$2) RETURNING id`, [data.email.toLowerCase().trim(), hashed]);
    id = created.rows[0].id;
    await client.query("COMMIT");
  } catch (error) {
    try {await client.query("ROLLBACK");} catch {}
    console.error("Setup error", error);
    return apiError("Não foi possível criar a conta.", 500);
  } finally {client.release();}
  await createSession(id);
  return NextResponse.json({ok:true});
}
