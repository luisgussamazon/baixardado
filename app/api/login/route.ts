import { db } from "@/lib/db";
import { apiError, isJson, parseJson } from "@/lib/http";
import { createSession, clientFingerprint, loginAllowed, validEmail, validOrigin, verifyPassword } from "@/lib/security";
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!validOrigin(req) || !isJson(req)) return apiError("Solicitação não autorizada.", 403);
    const rateKey = "login:" + clientFingerprint(req);
    if (!await loginAllowed(rateKey)) return apiError("Muitas tentativas. Tente em 15 minutos.", 429);
    const body = await parseJson(req);
    if (!body || !validEmail(body.email) || typeof body.password !== "string" || body.password.length > 128)
      return apiError("Credenciais inválidas.", 401);
    const result = await db.query<{id:string;password_hash:string}>(
      "SELECT id,password_hash FROM users WHERE email=$1 LIMIT 1", [body.email.toLowerCase().trim()]);
    const user = result.rows[0];
    // Execute scrypt mesmo para contas inexistentes para reduzir enumeração por tempo.
    const fallbackHash = `${"0".repeat(48)}:${"0".repeat(128)}`;
    const verified = await verifyPassword(body.password, user?.password_hash ?? fallbackHash);
    if (!user || !verified) return apiError("E-mail ou senha incorretos.", 401);
    await db.query("DELETE FROM login_attempts WHERE key=$1", [rateKey]);
    await createSession(user.id);
    return NextResponse.json({ok:true});
  } catch {
    return apiError("Serviço temporariamente indisponível. Tente novamente.", 503);
  }
}
