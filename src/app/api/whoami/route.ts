import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { ipVersion, normalizeIp } from "@/lib/ip";
import { safeJsonFetch } from "@/lib/safeFetch";

type BgpViewIpResponse = {
  data?: {
    ip?: string;
    prefix?: string;
    asn?: {
      asn?: number;
      name?: string;
      description_short?: string;
      country_code?: string;
    };
  };
};

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

  const ptr = ip !== "unknown" ? await reverseDns(ip) : null;

  const enrichment =
    ip !== "unknown"
      ? await safeJsonFetch<BgpViewIpResponse>(`https://api.bgpview.io/ip/${encodeURIComponent(ip)}`, {
          timeoutMs: 4000,
        })
      : { ok: false as const, error: "unknown ip", fetchedAt: new Date().toISOString() };

  const asn =
    enrichment.ok && enrichment.value?.data?.asn?.asn
      ? {
          asn: enrichment.value.data.asn.asn ?? null,
          name: enrichment.value.data.asn.name ?? "",
          description: enrichment.value.data.asn.description_short ?? "",
          country: enrichment.value.data.asn.country_code ?? "",
          prefix: enrichment.value.data.prefix ?? "",
        }
      : null;

  return Response.json({
    serverObserved: { ...serverObserved, trust: "trusted" as const },
    reverseDns: { ptr, trust: "trusted" as const },
    bgpview: enrichment.ok
      ? { data: enrichment.value, fetchedAt: enrichment.fetchedAt, trust: "untrusted" as const }
      : { error: enrichment.error, fetchedAt: enrichment.fetchedAt, trust: "untrusted" as const },
    asnSummary: { asn, trust: "untrusted" as const },
    notes: [
      "Server-observed fields are trusted.",
      "Enrichment is best-effort external data; treat as approximate.",
      "This endpoint avoids cookies/credentials on outbound fetches.",
    ],
  });
}

