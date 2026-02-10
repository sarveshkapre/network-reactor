"use client";

import { useMemo, useState } from "react";

type LookupResponse = Record<string, unknown>;

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

export default function BgpPage() {
  const [q, setQ] = useState("8.8.8.8");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (override?: string) => {
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const query = (override ?? q).trim();
      const res = await fetch(`/api/bgp/lookup?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const json = (await res.json()) as LookupResponse;
      if (!res.ok) {
        throw new Error((json["error"] as string) || `HTTP ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => summarizeBgpView(data), [data]);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">BGP Explorer</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          Search an IP, prefix (CIDR), or ASN. Data is best-effort external enrichment and should be treated
          as approximate. Provider: RIPEstat.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            onClick={() => {
              setQ("8.8.8.8");
              void run("8.8.8.8");
            }}
            disabled={loading}
          >
            try 8.8.8.8
          </button>
          <button
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            onClick={() => {
              setQ("8.8.8.0/24");
              void run("8.8.8.0/24");
            }}
            disabled={loading}
          >
            try 8.8.8.0/24
          </button>
          <button
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            onClick={() => {
              setQ("15169");
              void run("15169");
            }}
            disabled={loading}
          >
            try 15169
          </button>
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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="8.8.8.8 | 8.8.8.0/24 | 15169"
          />
          <button
            className="shrink-0 rounded-xl bg-sky-400/20 px-4 py-3 text-sm font-semibold text-sky-100 ring-1 ring-sky-300/30 hover:bg-sky-400/25 disabled:opacity-50"
            onClick={() => void run()}
            disabled={loading || !q.trim()}
          >
            {loading ? "Searching…" : "Lookup"}
          </button>
        </div>
        {err ? (
          <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </section>

      {summary ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Summary">
            <div className="grid gap-2 text-sm text-white/75">
              {summary.items.map((it) => (
                <div key={it.k} className="flex items-start justify-between gap-4">
                  <div className="text-white/55">{it.k}</div>
                  <div className="text-right font-mono text-xs text-white/85">{it.v}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Notes">
            <ul className="list-disc space-y-1 pl-5 text-sm text-white/65">
              <li>Every result includes a timestamp.</li>
              <li>Future v2: real time travel, anomalies, RPKI posture, and evidence links.</li>
            </ul>
          </Panel>
        </section>
      ) : null}

      {data ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">Raw result</div>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-5 text-white/80 ring-1 ring-white/10">
            {prettyJson(data)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function summarizeBgpView(data: LookupResponse | null) {
  if (!data) return null;
  const kind = String(data["kind"] ?? "");
  const fetchedAt = String(data["fetchedAt"] ?? "");
  const d = data["data"];
  const summary = asRecord(data["summary"]);

  const items: Array<{ k: string; v: string }> = [
    { k: "kind", v: kind || "-" },
    { k: "source", v: String(data["source"] ?? "-") },
    { k: "fetchedAt", v: fetchedAt || "-" },
  ];

  if (kind === "ip") {
    items.push({ k: "ip", v: String(get(summary, ["ip"]) ?? "-") });
    items.push({ k: "prefix", v: String(get(summary, ["prefix"]) ?? "-") });
    const asns = get(summary, ["asns"]);
    const asnList = Array.isArray(asns)
      ? asns
          .filter((x): x is string | number => typeof x === "string" || typeof x === "number")
          .map(String)
          .join(", ")
      : "";
    items.push({ k: "asns", v: asnList || "-" });
    items.push({ k: "holder", v: String(get(d, ["prefixOverview", "data", "data", "asns", 0, "holder"]) ?? "-") });
    const rpki = summarizeRpki(d);
    if (rpki) items.push({ k: "rpki", v: rpki });
  } else if (kind === "prefix") {
    items.push({ k: "prefix", v: String(get(summary, ["prefix"]) ?? "-") });
    const origins = get(summary, ["origins"]);
    const originList = Array.isArray(origins) ? origins : [];
    const originAsns = originList
      .map((x) => get(x, ["asn"]))
      .filter((x): x is string | number => typeof x === "string" || typeof x === "number")
      .join(", ");
    items.push({ k: "origin ASNs", v: originAsns || "-" });
    const rpki = summarizeRpki(d);
    if (rpki) items.push({ k: "rpki", v: rpki });
  } else if (kind === "asn") {
    items.push({ k: "asn", v: String(get(summary, ["asn"]) ?? "-") });
    items.push({ k: "holder", v: String(get(d, ["asOverview", "data", "data", "holder"]) ?? "-") });
    items.push({ k: "announced", v: String(get(d, ["asOverview", "data", "data", "announced"]) ?? "-") });
  }

  return { items };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function get(v: unknown, path: Array<string | number>): unknown {
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

function summarizeRpki(d: unknown): string | null {
  const validations = get(d, ["rpkiValidations"]);
  const arr = Array.isArray(validations) ? validations : [];
  const statuses = arr
    .map((x) => get(x, ["data", "status"]))
    .filter((x): x is string => typeof x === "string" && !!x);
  if (!statuses.length) return null;
  const uniq = Array.from(new Set(statuses));
  return uniq.join(", ");
}
