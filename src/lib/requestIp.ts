import { NextRequest } from "next/server";
import { normalizeIp } from "@/lib/ip";

export function getClientIp(req: NextRequest): string | null {
  // Prefer CDN/proxy-provided headers when present. Treat as best-effort.
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  const xri = h.get("x-real-ip");
  const xff = h.get("x-forwarded-for");
  const candidate =
    normalizeIp(cf) ??
    normalizeIp(xri) ??
    normalizeIp(xff) ??
    normalizeIp((req as unknown as { ip?: string }).ip ?? null);
  return candidate;
}

