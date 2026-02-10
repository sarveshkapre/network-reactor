import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/requestIp";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";
  const rl = checkRateLimit({ key: `speed:upload:${ip}`, max: 60, windowMs: 60_000 });
  const baseHeaders = { "cache-control": "no-store", ...rl.headers };
  if (!rl.ok) {
    return Response.json({ ok: false, error: "rate limited", trust: "trusted" }, { status: 429, headers: baseHeaders });
  }

  const maxBytes = 128 * 1024 * 1024;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return Response.json({ ok: false, error: "payload too large", trust: "trusted" }, { status: 413, headers: baseHeaders });
  }

  const body = req.body;
  if (!body) {
    return Response.json({ ok: false, error: "missing body", trust: "trusted" }, { status: 400, headers: baseHeaders });
  }

  const reader = body.getReader();
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value?.byteLength ?? 0;
    if (total > maxBytes) {
      return Response.json({ ok: false, error: "payload too large", trust: "trusted" }, { status: 413, headers: baseHeaders });
    }
  }

  return Response.json({
    ok: true,
    bytesReceived: total,
    iso: new Date().toISOString(),
  }, { headers: baseHeaders });
}
