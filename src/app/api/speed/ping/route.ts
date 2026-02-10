import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/requestIp";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";
  const rl = checkRateLimit({ key: `speed:ping:${ip}`, max: 600, windowMs: 60_000 });
  const headers = { "cache-control": "no-store", ...rl.headers };
  if (!rl.ok) {
    return Response.json({ ok: false, error: "rate limited", trust: "trusted" }, { status: 429, headers });
  }
  return Response.json({
    ok: true,
    serverTime: Date.now(),
    iso: new Date().toISOString(),
  }, { headers });
}
