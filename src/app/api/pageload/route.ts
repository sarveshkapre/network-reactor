import { NextRequest } from "next/server";
import { SafeFetchResult, safeJsonFetch } from "@/lib/safeFetch";

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

function validateUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "URL must start with http:// or https://" };
    }
    if (!u.hostname || u.hostname.length > 253) {
      return { ok: false, error: "Invalid hostname" };
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

  return Response.json(payload);
}
