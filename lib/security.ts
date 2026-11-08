import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const scrypt = promisify(rawScrypt);
const COOKIE = "a3x_session";
const SESSION_AGE = 60 * 60 * 24 * 7;
export type CurrentUser = { id: string; email: string };

export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, saved] = stored.split(":");
  if (!/^[0-9a-f]{48}$/i.test(salt ?? "") || !/^[0-9a-f]{128}$/i.test(saved ?? "")) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const previous = Buffer.from(saved, "hex");
  return timingSafeEqual(derived, previous);
}
export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function safeSecretMatch(a: string, b: string) {
  const ha = Buffer.from(sha256(a), "hex");
  const hb = Buffer.from(sha256(b), "hex");
  return timingSafeEqual(ha, hb);
}
export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("base64url");
  await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at)
    VALUES($1,$2,NOW()+INTERVAL '7 days')`, [sha256(raw), userId]);
  (await cookies()).set(COOKIE, raw, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_AGE,
  });
}
export async function getUser(): Promise<CurrentUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const result = await db.query<CurrentUser>(`SELECT u.id, u.email FROM sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at > NOW() LIMIT 1`, [sha256(raw)]);
  return result.rows[0] ?? null;
}
export async function destroySession() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw) await db.query("DELETE FROM sessions WHERE token_hash=$1", [sha256(raw)]);
  (await cookies()).delete(COOKIE);
}
export function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}
export function validOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.host === host &&
      (process.env.NODE_ENV !== "production" || parsed.protocol === "https:");
  } catch {return false;}
}
export async function loginAllowed(key: string) {
  // Janela móvel aproximada de 15 minutos; bloqueio a partir da 9ª tentativa.
  const result = await db.query<{ attempts: number }>(`INSERT INTO login_attempts(key,attempts,resets_at)
    VALUES ($1,1,NOW()+INTERVAL '15 minutes')
    ON CONFLICT(key) DO UPDATE SET
      attempts=CASE WHEN login_attempts.resets_at < NOW() THEN 1 ELSE login_attempts.attempts+1 END,
      resets_at=CASE WHEN login_attempts.resets_at < NOW() THEN NOW()+INTERVAL '15 minutes' ELSE login_attempts.resets_at END
    RETURNING attempts`, [key]);
  return result.rows[0].attempts <= 8;
}
export function clientFingerprint(req: Request) {
  // Primeiro IP provido pelo proxy confiável em produção Railway.
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  return sha256(ip).slice(0, 32);
}
