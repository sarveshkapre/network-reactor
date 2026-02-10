"use client";

import { useMemo, useState } from "react";

type Phase = "idle" | "ping" | "download" | "upload" | "done" | "error";

function mbps(bytes: number, ms: number) {
  const bits = bytes * 8;
  const seconds = ms / 1000;
  return seconds > 0 ? bits / seconds / 1_000_000 : 0;
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(1);
}

function median(a: number[]) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)] ?? null;
}

function jitterMedianAbsDelta(a: number[]) {
  if (a.length < 2) return null;
  const diffs = a.slice(1).map((v, i) => Math.abs(v - a[i]!));
  return median(diffs);
}

export default function SpeedTestPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>("");
  const [latencies, setLatencies] = useState<number[]>([]);
  const [idleLoss, setIdleLoss] = useState<number>(0);
  const [downloadMbps, setDownloadMbps] = useState<number | null>(null);
  const [uploadMbps, setUploadMbps] = useState<number | null>(null);
  const [downloadSeries, setDownloadSeries] = useState<number[]>([]);
  const [uploadSeries, setUploadSeries] = useState<number[]>([]);
  const [downloadLoadedLatencies, setDownloadLoadedLatencies] = useState<number[]>([]);
  const [downloadLoadedLoss, setDownloadLoadedLoss] = useState<number>(0);
  const [uploadLoadedLatencies, setUploadLoadedLatencies] = useState<number[]>([]);
  const [uploadLoadedLoss, setUploadLoadedLoss] = useState<number>(0);

  const jitter = useMemo(() => jitterMedianAbsDelta(latencies), [latencies]);

  const medianLatency = useMemo(() => median(latencies), [latencies]);
  const loadedDownloadMedian = useMemo(() => median(downloadLoadedLatencies), [downloadLoadedLatencies]);
  const loadedUploadMedian = useMemo(() => median(uploadLoadedLatencies), [uploadLoadedLatencies]);

  const bufferbloatMs = useMemo(() => {
    if (medianLatency == null) return null;
    const worstLoaded = Math.max(loadedDownloadMedian ?? 0, loadedUploadMedian ?? 0);
    if (!worstLoaded) return null;
    return Math.max(0, worstLoaded - medianLatency);
  }, [medianLatency, loadedDownloadMedian, loadedUploadMedian]);

  function lossPct(lost: number, okCount: number) {
    const total = lost + okCount;
    if (!total) return null;
    return (lost / total) * 100;
  }

  const run = async () => {
    setError("");
    setLatencies([]);
    setIdleLoss(0);
    setDownloadMbps(null);
    setUploadMbps(null);
    setDownloadSeries([]);
    setUploadSeries([]);
    setDownloadLoadedLatencies([]);
    setDownloadLoadedLoss(0);
    setUploadLoadedLatencies([]);
    setUploadLoadedLoss(0);

    try {
      setPhase("ping");
      const p = await measurePing({ samples: 10, timeoutMs: 1200 });
      setLatencies(p.latenciesMs);
      setIdleLoss(p.lost);

      setPhase("download");
      const d = await measureDownload({ durationMs: 8000, concurrency: 4, mbPerRequest: 16 });
      setDownloadMbps(d.mbps);
      setDownloadSeries(d.seriesMbps);
      setDownloadLoadedLatencies(d.loadedLatenciesMs);
      setDownloadLoadedLoss(d.loadedLost);

      setPhase("upload");
      const u = await measureUpload({ durationMs: 8000, concurrency: 3, mbPerPost: 2 });
      setUploadMbps(u.mbps);
      setUploadSeries(u.seriesMbps);
      setUploadLoadedLatencies(u.loadedLatenciesMs);
      setUploadLoadedLoss(u.loadedLost);

      setPhase("done");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Speed Test</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          Browser-first throughput test using local endpoints. Results vary by device, browser, Wi‑Fi, VPN,
          and server proximity. Treat this as a diagnostic, not a lab instrument.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-white/70">
            Phase:{" "}
            <span className="font-mono text-xs text-white/85">
              {phase === "idle" ? "READY" : phase.toUpperCase()}
            </span>
          </div>
          <button
            className="rounded-xl bg-emerald-400/20 px-4 py-3 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 hover:bg-emerald-400/25 disabled:opacity-50"
            onClick={() => void run()}
            disabled={phase !== "idle" && phase !== "done" && phase !== "error"}
          >
            {phase === "idle" || phase === "done" || phase === "error" ? "Run speed test" : "Running…"}
          </button>
        </div>
        {error ? (
          <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric
          label="Idle latency / jitter"
          value={`${medianLatency != null ? `${Math.round(medianLatency)} ms` : "-"} / ${jitter != null ? `${Math.round(jitter)} ms` : "-"}`}
          sub={`loss ${lossPct(idleLoss, latencies.length) != null ? `${lossPct(idleLoss, latencies.length)!.toFixed(0)}%` : "-"}`}
        />
        <Metric
          label="Latency under download"
          value={loadedDownloadMedian != null ? `${Math.round(loadedDownloadMedian)} ms` : "-"}
          sub={`loss ${lossPct(downloadLoadedLoss, downloadLoadedLatencies.length) != null ? `${lossPct(downloadLoadedLoss, downloadLoadedLatencies.length)!.toFixed(0)}%` : "-"}`}
        />
        <Metric
          label="Latency under upload"
          value={loadedUploadMedian != null ? `${Math.round(loadedUploadMedian)} ms` : "-"}
          sub={`loss ${lossPct(uploadLoadedLoss, uploadLoadedLatencies.length) != null ? `${lossPct(uploadLoadedLoss, uploadLoadedLatencies.length)!.toFixed(0)}%` : "-"}`}
        />
        <Metric
          label="Download / Upload"
          value={`${downloadMbps != null ? fmt(downloadMbps) : "-"} / ${uploadMbps != null ? fmt(uploadMbps) : "-"} Mbps`}
          sub={bufferbloatMs != null ? `bufferbloat +${Math.round(bufferbloatMs)}ms` : "bufferbloat -"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Download stability (Mbps)">
          <Sparkline series={downloadSeries} />
        </Panel>
        <Panel title="Upload stability (Mbps)">
          <Sparkline series={uploadSeries} />
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-xs font-semibold text-white/60">{label}</div>
      <div className="mt-2 font-mono text-2xl text-white/90">{value}</div>
      {sub ? <div className="mt-2 text-xs text-white/55">{sub}</div> : null}
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

function Sparkline({ series }: { series: number[] }) {
  if (!series.length) {
    return <div className="text-sm text-white/55">No data yet.</div>;
  }
  const max = Math.max(...series, 0.1);
  return (
    <div className="flex h-20 items-end gap-1 rounded-xl bg-black/25 p-3 ring-1 ring-white/10">
      {series.slice(-24).map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-sm bg-white/70"
          style={{ height: `${Math.max(4, Math.round((v / max) * 64))}px`, opacity: 0.55 + 0.45 * (v / max) }}
          title={`${fmt(v)} Mbps`}
        />
      ))}
    </div>
  );
}

async function pingOnce(timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const t0 = performance.now();
    const res = await fetch("/api/speed/ping", { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`ping HTTP ${res.status}`);
    await res.json();
    return { ok: true as const, ms: performance.now() - t0 };
  } catch {
    return { ok: false as const, ms: null as number | null };
  } finally {
    clearTimeout(t);
  }
}

async function measurePing(opts: { samples: number; timeoutMs: number }) {
  const latenciesMs: number[] = [];
  let lost = 0;
  for (let i = 0; i < opts.samples; i++) {
    const r = await pingOnce(opts.timeoutMs);
    if (r.ok && r.ms != null) latenciesMs.push(r.ms);
    else lost++;
    await sleep(120);
  }
  return { latenciesMs, lost };
}

async function measureDownload(opts: { durationMs: number; concurrency: number; mbPerRequest: number }) {
  const endAt = performance.now() + opts.durationMs;
  let totalBytes = 0;
  const seriesMbps: number[] = [];

  let lastSampleAt = performance.now();
  let lastBytes = 0;

  const sampler = setInterval(() => {
    const now = performance.now();
    const dt = now - lastSampleAt;
    const db = totalBytes - lastBytes;
    seriesMbps.push(mbps(db, dt));
    lastSampleAt = now;
    lastBytes = totalBytes;
  }, 1000);

  const loadedLatenciesMs: number[] = [];
  let loadedLost = 0;

  const loadedPinger = (async () => {
    while (performance.now() < endAt) {
      const r = await pingOnce(1200);
      if (r.ok && r.ms != null) loadedLatenciesMs.push(r.ms);
      else loadedLost++;
      await sleep(220);
    }
  })();

  const workers = Array.from({ length: opts.concurrency }, async () => {
    while (performance.now() < endAt) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), Math.max(1500, opts.durationMs));
      try {
        const res = await fetch(`/api/speed/download?mb=${opts.mbPerRequest}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`download HTTP ${res.status}`);
        const reader = res.body?.getReader();
        if (!reader) throw new Error("download missing body");
        while (performance.now() < endAt) {
          const { value, done } = await reader.read();
          if (done) break;
          totalBytes += value?.byteLength ?? 0;
        }
        controller.abort();
      } catch {
        // ignore transient aborts
      } finally {
        clearTimeout(t);
      }
    }
  });

  await Promise.all(workers);
  await loadedPinger;
  clearInterval(sampler);

  const elapsedMs = opts.durationMs;
  return { mbps: mbps(totalBytes, elapsedMs), seriesMbps, loadedLatenciesMs, loadedLost };
}

async function measureUpload(opts: { durationMs: number; concurrency: number; mbPerPost: number }) {
  const endAt = performance.now() + opts.durationMs;
  let totalBytes = 0;
  const seriesMbps: number[] = [];

  const payload = new Uint8Array(opts.mbPerPost * 1024 * 1024);
  for (let i = 0; i < payload.length; i++) payload[i] = (i * 31) & 0xff;

  let lastSampleAt = performance.now();
  let lastBytes = 0;

  const sampler = setInterval(() => {
    const now = performance.now();
    const dt = now - lastSampleAt;
    const db = totalBytes - lastBytes;
    seriesMbps.push(mbps(db, dt));
    lastSampleAt = now;
    lastBytes = totalBytes;
  }, 1000);

  const loadedLatenciesMs: number[] = [];
  let loadedLost = 0;

  const loadedPinger = (async () => {
    while (performance.now() < endAt) {
      const r = await pingOnce(1200);
      if (r.ok && r.ms != null) loadedLatenciesMs.push(r.ms);
      else loadedLost++;
      await sleep(220);
    }
  })();

  const workers = Array.from({ length: opts.concurrency }, async () => {
    while (performance.now() < endAt) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), Math.max(1500, opts.durationMs));
      try {
        const res = await fetch("/api/speed/upload", {
          method: "POST",
          body: payload,
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
        const json = (await res.json()) as { bytesReceived?: number };
        totalBytes += json.bytesReceived ?? payload.byteLength;
      } catch {
        // ignore transient aborts
      } finally {
        clearTimeout(t);
      }
    }
  });

  await Promise.all(workers);
  await loadedPinger;
  clearInterval(sampler);

  const elapsedMs = opts.durationMs;
  return { mbps: mbps(totalBytes, elapsedMs), seriesMbps, loadedLatenciesMs, loadedLost };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
