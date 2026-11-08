import { NextResponse } from "next/server";
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: {"Cache-Control": "no-store"} });
}
export function isJson(req: Request) {
  return (req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}
export async function parseJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw = await req.text();
    if (raw.length > 12_000) return null;
    const obj: unknown = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    return obj as Record<string, unknown>;
  } catch {return null;}
}
export function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
