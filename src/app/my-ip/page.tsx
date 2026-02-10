"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type WhoAmIResponse = Record<string, unknown>;

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

export default function MyIpPage() {
  const [data, setData] = useState<WhoAmIResponse | null>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/whoami", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WhoAmIResponse;
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const serverObserved = useMemo(() => (data ? (data["serverObserved"] as unknown) : null), [data]);
  const asnSummary = useMemo(() => (data ? (data["asnSummary"] as unknown) : null), [data]);
  const reverseDns = useMemo(() => (data ? (data["reverseDns"] as unknown) : null), [data]);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">My IP</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          “Server observed” is what this server sees. Enrichment (ASN/prefix, etc.) is best-effort external
          data and is labeled as untrusted.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/85 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="rounded-full border border-white/15 bg-black/10 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
            onClick={() => void copyText(prettyJson(data))}
            disabled={!data}
          >
            Copy JSON
          </button>
        </div>
        {err ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Server Observed (trusted)">
          <CodeBlock value={serverObserved} />
        </Panel>
        <Panel title="ASN / Prefix (untrusted)">
          <CodeBlock value={asnSummary} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Reverse DNS (trusted)">
          <CodeBlock value={reverseDns} />
        </Panel>
        <Panel title="Raw enrichment (untrusted)">
          <CodeBlock value={data ? (data["bgpview"] as unknown) : null} />
        </Panel>
      </section>
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

function CodeBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl bg-black/30 p-4 text-xs leading-5 text-white/80 ring-1 ring-white/10">
      {prettyJson(value)}
    </pre>
  );
}

