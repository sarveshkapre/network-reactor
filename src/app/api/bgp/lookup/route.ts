import { NextRequest } from "next/server";
import { normalizeIp } from "@/lib/ip";
import { getClientIp } from "@/lib/requestIp";
import { checkRateLimit } from "@/lib/rateLimit";
import { safeJsonFetch } from "@/lib/safeFetch";

export const runtime = "nodejs";

type RipeStatGeneric = Record<string, unknown>;

function isAsn(q: string): boolean {
  return /^[0-9]{1,10}$/.test(q);
}

function isPrefix(q: string): boolean {
  // Minimal CIDR check.
  if (!q.includes("/")) return false;
  const [addr, mask] = q.split("/", 2);
  if (!addr || !mask) return false;
  const m = Number(mask);
  if (!Number.isFinite(m)) return false;
  if (addr.includes(":")) return m >= 0 && m <= 128;
  return m >= 0 && m <= 32;
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req) ?? "unknown";
  const rl = checkRateLimit({ key: `bgp:lookup:${clientIp}`, max: 45, windowMs: 60_000 });
  const baseHeaders = { "cache-control": "no-store", ...rl.headers };
  if (!rl.ok) {
    return Response.json({ ok: false, error: "rate limited", trust: "trusted" }, { status: 429, headers: baseHeaders });
  }

  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("q") ?? "").trim();
  if (!raw) {
    return Response.json(
      { ok: false, error: "missing query parameter q", trust: "trusted" },
      { status: 400, headers: baseHeaders },
    );
  }

  const q = raw.replace(/^AS/i, "");

  let kind: "ip" | "prefix" | "asn" | "unknown" = "unknown";
  const ip = normalizeIp(q);
  const asn = isAsn(q) ? q : null;
  const prefix = isPrefix(q) ? q : null;

  if (ip) kind = "ip";
  else if (prefix) kind = "prefix";
  else if (asn) kind = "asn";

  if (kind === "unknown") {
    return Response.json(
      {
        ok: false,
        error: "unrecognized query",
        hint: "Try an IP (8.8.8.8), prefix (8.8.8.0/24), or ASN (15169).",
        trust: "trusted",
      },
      { status: 400, headers: baseHeaders },
    );
  }

  const fetchedAt = new Date().toISOString();

  // Provider: RIPEstat (public endpoints; best-effort external enrichment).
  // Docs: https://stat.ripe.net/docs/data_api
  const base = "https://stat.ripe.net/data";
  const timeoutMs = 6000;

  async function fetchCall(path: string) {
    return safeJsonFetch<RipeStatGeneric>(`${base}/${path}`, {
      timeoutMs,
      headers: { accept: "application/json" },
    });
  }

  let networkInfo: unknown = null;
  let prefixOverview: unknown = null;
  let asOverview: unknown = null;
  const rpkiValidations: Array<unknown> = [];

  let summary:
    | { kind: "ip"; ip: string; prefix: string | null; asns: string[] }
    | { kind: "prefix"; prefix: string; origins: Array<{ asn: number; holder: string }> }
    | { kind: "asn"; asn: string }
    | null = null;

  if (kind === "ip" && ip) {
    const ni = await fetchCall(`network-info/data.json?resource=${encodeURIComponent(ip)}`);
    networkInfo = ni.ok ? ni.value : { error: ni.error, fetchedAt: ni.fetchedAt };
    if (!ni.ok) {
      return Response.json(
        { ok: false, kind, query: raw, source: "ripe-stat", fetchedAt, error: ni.error, trust: "untrusted" },
        { status: 502, headers: baseHeaders },
      );
    }

    const data = (ni.value["data"] ?? null) as Record<string, unknown> | null;
    const pfx = typeof data?.["prefix"] === "string" ? (data["prefix"] as string) : null;
    const asnsRaw = data?.["asns"];
    const asns =
      Array.isArray(asnsRaw) ? asnsRaw.filter((x): x is string => typeof x === "string") : [];

    summary = { kind: "ip", ip, prefix: pfx, asns };

    if (pfx) {
      const po = await fetchCall(`prefix-overview/data.json?resource=${encodeURIComponent(pfx)}`);
      prefixOverview = po.ok ? po.value : { error: po.error, fetchedAt: po.fetchedAt };
      // RPKI: best-effort for a couple of origin ASNs.
      const rpki = await Promise.all(
        asns.slice(0, 3).map(async (origin) => {
          const rv = await fetchCall(
            `rpki-validation/data.json?resource=${encodeURIComponent(origin)}&prefix=${encodeURIComponent(pfx)}`,
          );
          return rv.ok ? rv.value : { error: rv.error, fetchedAt: rv.fetchedAt, origin, prefix: pfx };
        }),
      );
      rpkiValidations.push(...rpki);
    }
  }

  if (kind === "prefix" && prefix) {
    const po = await fetchCall(`prefix-overview/data.json?resource=${encodeURIComponent(prefix)}`);
    prefixOverview = po.ok ? po.value : { error: po.error, fetchedAt: po.fetchedAt };
    if (!po.ok) {
      return Response.json(
        { ok: false, kind, query: raw, source: "ripe-stat", fetchedAt, error: po.error, trust: "untrusted" },
        { status: 502, headers: baseHeaders },
      );
    }

    const data = (po.value["data"] ?? null) as Record<string, unknown> | null;
    const asnsRaw = data?.["asns"];
    const origins: Array<{ asn: number; holder: string }> = [];
    if (Array.isArray(asnsRaw)) {
      for (const entry of asnsRaw) {
        if (!entry || typeof entry !== "object") continue;
        const r = entry as Record<string, unknown>;
        const a = typeof r["asn"] === "number" ? r["asn"] : null;
        if (a == null) continue;
        origins.push({ asn: a, holder: typeof r["holder"] === "string" ? r["holder"] : "" });
      }
    }
    summary = { kind: "prefix", prefix, origins };

    const rpki = await Promise.all(
      origins.slice(0, 3).map(async (origin) => {
        const rv = await fetchCall(
          `rpki-validation/data.json?resource=${encodeURIComponent(String(origin.asn))}&prefix=${encodeURIComponent(prefix)}`,
        );
        return rv.ok ? rv.value : { error: rv.error, fetchedAt: rv.fetchedAt, origin: String(origin.asn), prefix };
      }),
    );
    rpkiValidations.push(...rpki);
  }

  if (kind === "asn" && asn) {
    const ao = await fetchCall(`as-overview/data.json?resource=${encodeURIComponent(asn)}`);
    asOverview = ao.ok ? ao.value : { error: ao.error, fetchedAt: ao.fetchedAt };
    if (!ao.ok) {
      return Response.json(
        { ok: false, kind, query: raw, source: "ripe-stat", fetchedAt, error: ao.error, trust: "untrusted" },
        { status: 502, headers: baseHeaders },
      );
    }
    summary = { kind: "asn", asn };
  }

  return Response.json({
    ok: true,
    kind,
    query: raw,
    source: "ripe-stat",
    fetchedAt,
    summary,
    data: {
      networkInfo,
      prefixOverview,
      asOverview,
      rpkiValidations: rpkiValidations.length ? rpkiValidations : null,
    },
    trust: "untrusted",
    notes: ["Data is best-effort external enrichment; treat as approximate.", "Provider: RIPEstat Data API."],
  }, { headers: baseHeaders });
}
