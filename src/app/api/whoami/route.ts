import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { ipVersion, normalizeIp } from "@/lib/ip";
import { safeJsonFetch } from "@/lib/safeFetch";

export const runtime = "nodejs";

type RipeStatGeneric = Record<string, unknown>;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function getPath(v: unknown, path: Array<string | number>): unknown {
  let cur: unknown = v;
  for (const p of path) {
    if (typeof p === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[p];
      continue;
    }
    const r = asRecord(cur);
    if (!r) return undefined;
    cur = r[p];
  }
  return cur;
}

async function reverseDns(ip: string): Promise<string[] | null> {
  try {
    const res = await Promise.race([
      dns.reverse(ip),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error("reverse dns timeout")), 1200),
      ),
    ]);
    return Array.isArray(res) ? res : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const privacyRaw = (searchParams.get("privacy") ?? "").trim().toLowerCase();
  const privacyMode = privacyRaw === "1" || privacyRaw === "true" || privacyRaw === "yes" || privacyRaw === "on";

  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  const xri = headers.get("x-real-ip");
  const cf = headers.get("cf-connecting-ip");
  const candidate =
    normalizeIp(cf) ??
    normalizeIp(xri) ??
    normalizeIp(xff) ??
    normalizeIp((req as unknown as { ip?: string }).ip ?? null);

  const ip = candidate ?? "unknown";

  const serverObserved = {
    ip,
    ipVersion: ip === "unknown" ? "unknown" : ipVersion(ip),
    userAgent: headers.get("user-agent") ?? "",
    acceptLanguage: headers.get("accept-language") ?? "",
    forwardedFor: xff ?? "",
    realIp: xri ?? "",
    cfConnectingIp: cf ?? "",
    timestamp: new Date().toISOString(),
  };

  const ptr = !privacyMode && ip !== "unknown" ? await reverseDns(ip) : null;

  // Provider: RIPEstat (best-effort external enrichment).
  // Docs: https://stat.ripe.net/docs/data_api
  const base = "https://stat.ripe.net/data";
  const timeoutMs = 6000;

  async function fetchCall(path: string) {
    return safeJsonFetch<RipeStatGeneric>(`${base}/${path}`, {
      timeoutMs,
      headers: { accept: "application/json" },
    });
  }

  const networkInfo =
    !privacyMode && ip !== "unknown"
      ? await fetchCall(`network-info/data.json?resource=${encodeURIComponent(ip)}`)
      : { ok: false as const, error: privacyMode ? "privacy mode enabled" : "unknown ip", fetchedAt: new Date().toISOString() };

  const niData = networkInfo.ok ? ((networkInfo.value["data"] ?? null) as Record<string, unknown> | null) : null;
  const prefix = networkInfo.ok && typeof niData?.["prefix"] === "string" ? (niData["prefix"] as string) : null;
  const asns =
    networkInfo.ok && Array.isArray(niData?.["asns"])
      ? (niData?.["asns"] as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

  const prefixOverview =
    !privacyMode && prefix
      ? await fetchCall(`prefix-overview/data.json?resource=${encodeURIComponent(prefix)}`)
      : { ok: false as const, error: privacyMode ? "privacy mode enabled" : "missing prefix", fetchedAt: new Date().toISOString() };

  const originAsn = asns[0] ?? null;
  const rpkiValidation =
    !privacyMode && originAsn && prefix
      ? await fetchCall(
          `rpki-validation/data.json?resource=${encodeURIComponent(originAsn)}&prefix=${encodeURIComponent(prefix)}`,
        )
      : { ok: false as const, error: privacyMode ? "privacy mode enabled" : "missing origin asn/prefix", fetchedAt: new Date().toISOString() };

  const holder =
    prefixOverview.ok && typeof getPath(prefixOverview.value, ["data", "asns", 0, "holder"]) === "string"
      ? (getPath(prefixOverview.value, ["data", "asns", 0, "holder"]) as string)
      : "";

  const asnSummary =
    originAsn || prefix
      ? {
          asn: originAsn,
          prefix,
          holder,
          rpkiStatus:
            rpkiValidation.ok && typeof getPath(rpkiValidation.value, ["data", "status"]) === "string"
              ? (getPath(rpkiValidation.value, ["data", "status"]) as string)
              : "",
        }
      : null;

  return Response.json({
    serverObserved: { ...serverObserved, trust: "trusted" as const },
    privacyMode: { enabled: privacyMode, trust: "trusted" as const },
    reverseDns: {
      ptr,
      trust: "untrusted" as const,
      notes: ["Reverse DNS is best-effort and depends on resolver behavior; treat as approximate."],
    },
    ripeStat: {
      networkInfo: networkInfo.ok
        ? { data: networkInfo.value, fetchedAt: networkInfo.fetchedAt, trust: "untrusted" as const }
        : { error: networkInfo.error, fetchedAt: networkInfo.fetchedAt, trust: "untrusted" as const },
      prefixOverview: prefixOverview.ok
        ? { data: prefixOverview.value, fetchedAt: prefixOverview.fetchedAt, trust: "untrusted" as const }
        : { error: prefixOverview.error, fetchedAt: prefixOverview.fetchedAt, trust: "untrusted" as const },
      rpkiValidation: rpkiValidation.ok
        ? { data: rpkiValidation.value, fetchedAt: rpkiValidation.fetchedAt, trust: "untrusted" as const }
        : { error: rpkiValidation.error, fetchedAt: rpkiValidation.fetchedAt, trust: "untrusted" as const },
    },
    asnSummary: { asn: asnSummary, trust: "untrusted" as const },
    notes: [
      "Server-observed fields are trusted (what this server received).",
      "Forwarded-IP headers are hints and can be spoofed outside a trusted proxy/CDN boundary.",
      "Enrichment is best-effort external data; treat as approximate.",
      "This endpoint avoids cookies/credentials on outbound fetches.",
    ],
  }, { headers: { "cache-control": "no-store" } });
}
