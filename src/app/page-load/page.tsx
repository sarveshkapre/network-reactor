"use client";

import { useMemo, useState } from "react";

type PsiMetric = {
  id: string;
  title: string;
  displayValue: string;
  numericValue: number | null;
  score: number | null;
};

type PsiOpportunity = {
  id: string;
  title: string;
  description: string;
  savingsMs: number | null;
  displayValue: string;
};

type PsiSummary = {
  fetchedAt: string;
  perfScore: number | null;
  metrics: PsiMetric[];
  opportunities: PsiOpportunity[];
  raw: unknown;
};

type PageLoadResponse = {
  url: string;
  source: string;
  notes?: string[];
  mobile: PsiSummary | { error: string; fetchedAt: string } | null;
  desktop: PsiSummary | { error: string; fetchedAt: string } | null;
};

function prettyJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function pct(n: number | null) {
  if (n == null) return "-";
  return `${Math.round(n * 100)}%`;
}

export default function PageLoadLab() {
  const [url, setUrl] = useState("https://example.com");
  const [data, setData] = useState<PageLoadResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const res = await fetch(`/api/pageload?url=${encodeURIComponent(url.trim())}`, { cache: "no-store" });
      const json = (await res.json()) as PageLoadResponse;
      if (!res.ok) {
        const maybeError = (json as unknown as Record<string, unknown>)["error"];
        throw new Error(typeof maybeError === "string" ? maybeError : `HTTP ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const mobile = useMemo(() => (data?.mobile && "perfScore" in data.mobile ? (data.mobile as PsiSummary) : null), [data]);
  const desktop = useMemo(
    () => (data?.desktop && "perfScore" in data.desktop ? (data.desktop as PsiSummary) : null),
    [data],
  );
  const mobileErr = useMemo(
    () => (data?.mobile && "error" in data.mobile ? (data.mobile as { error: string; fetchedAt: string }) : null),
    [data],
  );
  const desktopErr = useMemo(
    () => (data?.desktop && "error" in data.desktop ? (data.desktop as { error: string; fetchedAt: string }) : null),
    [data],
  );

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Page Load Lab</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          V1 uses PageSpeed Insights to get credible Core Web Vitals and a ranked list of “why slow?”
          opportunities. Future v2 adds a real-browser waterfall and CPU timeline.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-white/15 bg-black/10 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
            onClick={() => void copyText(prettyJson(data))}
            disabled={!data}
          >
            Copy JSON
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-sky-300/40"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <button
            className="shrink-0 rounded-xl bg-sky-400/20 px-4 py-3 text-sm font-semibold text-sky-100 ring-1 ring-sky-300/30 hover:bg-sky-400/25 disabled:opacity-50"
            onClick={() => void run()}
            disabled={loading || !url.trim()}
          >
            {loading ? "Running…" : "Run test"}
          </button>
        </div>
        {err ? (
          <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </section>

      {data?.notes?.length ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/65 ring-1 ring-white/10">
          <div className="font-semibold text-white/90">Notes</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {mobile || desktop || mobileErr || desktopErr ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mobile ? <SummaryPanel label="Mobile" summary={mobile} /> : null}
          {desktop ? <SummaryPanel label="Desktop" summary={desktop} /> : null}
          {mobileErr ? <ErrorPanel label="Mobile" err={mobileErr} /> : null}
          {desktopErr ? <ErrorPanel label="Desktop" err={desktopErr} /> : null}
        </section>
      ) : null}

      {data ? (
        <details className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <summary className="cursor-pointer text-sm font-semibold text-white/85">Raw response</summary>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-5 text-white/80 ring-1 ring-white/10">
            {prettyJson(data)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function SummaryPanel({ label, summary }: { label: string; summary: PsiSummary }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-white/90">{label}</div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
          perf {pct(summary.perfScore)}
        </div>
      </div>
      <div className="mt-2 text-xs text-white/55">fetchedAt {summary.fetchedAt}</div>

      <div className="mt-4 grid gap-3">
        <div className="text-xs font-semibold text-white/70">Key metrics</div>
        <div className="grid gap-2">
          {summary.metrics.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-4">
              <div className="text-sm text-white/70">{m.title}</div>
              <div className="text-right font-mono text-xs text-white/85">{m.displayValue || "-"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="text-xs font-semibold text-white/70">Top “why slow?” opportunities</div>
        <div className="grid gap-2">
          {summary.opportunities.map((o) => (
            <div key={o.id} className="rounded-xl border border-white/10 bg-black/20 p-3 ring-1 ring-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-white/85">{o.title}</div>
                <div className="shrink-0 font-mono text-xs text-white/70">
                  {o.savingsMs != null ? `${Math.round(o.savingsMs)}ms` : o.displayValue || "-"}
                </div>
              </div>
              {o.description ? <div className="mt-1 text-xs leading-5 text-white/60">{o.description}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ label, err }: { label: string; err: { error: string; fetchedAt: string } }) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 ring-1 ring-red-400/15">
      <div className="text-sm font-semibold text-red-200">{label} error</div>
      <div className="mt-2 text-xs text-red-100/80">fetchedAt {err.fetchedAt}</div>
      <div className="mt-3 text-sm text-red-100/90">{err.error}</div>
    </div>
  );
}
