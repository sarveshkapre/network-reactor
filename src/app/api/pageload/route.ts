import { NextRequest } from "next/server";
import { SafeFetchResult, safeJsonFetch } from "@/lib/safeFetch";
import { normalizeIp } from "@/lib/ip";

export const runtime = "nodejs";

type PsiResponse = Record<string, unknown>;

type LhrAudit = {
  title?: string;
  description?: string;
  displayValue?: string;
  numericValue?: number;
  score?: number | null;
  details?: {
    type?: string;
    overallSavingsMs?: number;
  };
};

type LighthouseResult = {
  categories?: {
    performance?: { score?: number };
  };
  audits?: Record<string, LhrAudit>;
};

function isPrivateOrLocalhost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;

  const ip = normalizeIp(h);
  if (!ip) return false;
  // IPv4 private/reserved ranges.
  if (ip.includes(".")) {
    const parts = ip.split(".").map((x) => Number(x));
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b != null && b >= 16 && b <= 31) return true;
    return false;
  }

  // IPv6 loopback/link-local/ULA.
  if (ip === "::1") return true;
  if (ip.startsWith("fe80:") || ip.startsWith("fe80::")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 (coarse)
  return false;
}

function validateUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "URL must start with http:// or https://" };
    }
    if (!u.hostname || u.hostname.length > 253) {
      return { ok: false, error: "Invalid hostname" };
    }
    if (isPrivateOrLocalhost(u.hostname)) {
      return {
        ok: false,
        error:
          "This v1 runs via PageSpeed Insights, which cannot test localhost/private IPs. Use a public URL.",
      };
    }
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
}

function pickAuditMetric(lhr: LighthouseResult | null, id: string) {
  const a = lhr?.audits?.[id];
  if (!a) return null;
  return {
    id,
    title: a.title ?? "",
    displayValue: a.displayValue ?? "",
    numericValue: typeof a.numericValue === "number" ? a.numericValue : null,
    score: typeof a.score === "number" ? a.score : null,
  };
}

function pickOpportunities(lhr: LighthouseResult | null) {
  const audits = lhr?.audits ?? {};
  const out: Array<{
    id: string;
    title: string;
    description: string;
    savingsMs: number | null;
    displayValue: string;
  }> = [];

  for (const [id, a] of Object.entries(audits)) {
    if (!a || a.details?.type !== "opportunity") continue;
    const savingsMs =
      typeof a.details?.overallSavingsMs === "number"
        ? a.details.overallSavingsMs
        : typeof a.numericValue === "number"
          ? a.numericValue
          : null;
    out.push({
      id,
      title: a.title ?? id,
      description: a.description ?? "",
      savingsMs,
      displayValue: a.displayValue ?? "",
    });
  }

  out.sort((x, y) => (y.savingsMs ?? 0) - (x.savingsMs ?? 0));
  return out.slice(0, 12);
}

async function runPsi(targetUrl: string, strategy: "mobile" | "desktop") {
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", targetUrl);
  api.searchParams.set("strategy", strategy);
  api.searchParams.append("category", "performance");
  api.searchParams.append("category", "best-practices");
  api.searchParams.append("category", "seo");
  if (process.env.PAGESPEED_API_KEY) {
    api.searchParams.set("key", process.env.PAGESPEED_API_KEY);
  }

  return safeJsonFetch<PsiResponse>(api.toString(), { timeoutMs: 12000 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("url") ?? "").trim();
  if (!raw) {
    return Response.json({ error: "missing query parameter url" }, { status: 400 });
  }

  const v = validateUrl(raw);
  if (!v.ok) {
    return Response.json({ error: v.error }, { status: 400 });
  }

  const [mobile, desktop] = await Promise.all([runPsi(v.url, "mobile"), runPsi(v.url, "desktop")]);

  function summarize(res: SafeFetchResult<PsiResponse>) {
    if (!res.ok) return null;
    const json = res.value;
    const lhr = (json["lighthouseResult"] ?? null) as LighthouseResult | null;
    const perfScore =
      typeof lhr?.categories?.performance?.score === "number" ? lhr.categories.performance.score : null;
    const metrics = [
      pickAuditMetric(lhr, "server-response-time"),
      pickAuditMetric(lhr, "largest-contentful-paint"),
      pickAuditMetric(lhr, "interaction-to-next-paint"),
      pickAuditMetric(lhr, "cumulative-layout-shift"),
      pickAuditMetric(lhr, "total-blocking-time"),
      pickAuditMetric(lhr, "speed-index"),
    ].filter(Boolean);

    return {
      fetchedAt: res.fetchedAt,
      perfScore,
      metrics,
      opportunities: pickOpportunities(lhr),
      raw: json,
    };
  }

  const payload = {
    url: v.url,
    source: "pagespeed-insights",
    notes: [
      "This v1 uses PageSpeed Insights for a credible “why slow?” explanation.",
      "For a true request waterfall and CPU timeline, add a real-browser runner (Playwright) in v2.",
    ],
    mobile: mobile.ok ? summarize(mobile) : { error: mobile.error, fetchedAt: mobile.fetchedAt },
    desktop: desktop.ok ? summarize(desktop) : { error: desktop.error, fetchedAt: desktop.fetchedAt },
    trust: "untrusted",
  };

  return Response.json(payload, { headers: { "cache-control": "no-store" } });
}
