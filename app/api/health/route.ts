import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ ok: true, service: "a3x-ai" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
