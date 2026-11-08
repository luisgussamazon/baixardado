import { NextResponse } from "next/server";
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: {"Cache-Control": "no-store"} });
}
export function isJson(req: Request) {
  return (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() === "application/json";
}
export async function parseJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    if (!req.body) return null;
    const reader = req.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let raw = "", size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 32_768) { await reader.cancel(); return null; }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
    } finally { reader.releaseLock(); }
    const obj: unknown = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    return obj as Record<string, unknown>;
  } catch {return null;}
}
export function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
