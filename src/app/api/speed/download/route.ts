import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/requestIp";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function makeTemplate(size: number) {
  const out = new Uint8Array(size);
  // Fast, deterministic PRNG (xorshift32) to produce incompressible-ish bytes without crypto cost.
  let x = 0x6d2b79f5;
  for (let i = 0; i < out.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  return out;
}

const TEMPLATE = makeTemplate(64 * 1024);

export async function GET(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";
  const rl = checkRateLimit({ key: `speed:download:${ip}`, max: 90, windowMs: 60_000 });
  const rlHeaders = { ...rl.headers };
  if (!rl.ok) {
    return Response.json({ ok: false, error: "rate limited", trust: "trusted" }, { status: 429, headers: { "cache-control": "no-store", ...rlHeaders } });
  }

  const { searchParams } = new URL(req.url);
  const sizeMbRaw = Number(searchParams.get("mb") ?? "16");
  const sizeMb = clamp(Number.isFinite(sizeMbRaw) ? sizeMbRaw : 16, 1, 128);
  const totalBytes = sizeMb * 1024 * 1024;

  const chunkSize = 64 * 1024;

  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const remaining = totalBytes - sent;
      if (remaining <= 0) {
        controller.close();
        return;
      }
      const n = Math.min(chunkSize, remaining);
      // Copy from a deterministic template to reduce compressibility while avoiding per-chunk PRNG cost.
      const buf = TEMPLATE.slice(0, n);
      sent += n;
      controller.enqueue(buf);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/octet-stream",
      // Try to prevent platform compression from affecting throughput measurements.
      "content-encoding": "identity",
      vary: "accept-encoding",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-bytes": String(totalBytes),
      ...rlHeaders,
    },
  });
}
