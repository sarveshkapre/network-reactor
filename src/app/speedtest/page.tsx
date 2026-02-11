"use client";

import { useMemo, useState } from "react";
import { prettyJson } from "@/lib/json";

type Phase = "idle" | "ping" | "download" | "upload" | "done" | "error";

type SpeedSettings = {
  pingSamples: number;
  phaseDurationMs: number;
  downloadConcurrency: number;
  uploadConcurrency: number;
  downloadMbPerRequest: number;
  uploadMbPerPost: number;
};

const DEFAULT_SETTINGS: SpeedSettings = {
  pingSamples: 10,
  phaseDurationMs: 8000,
  downloadConcurrency: 4,
  uploadConcurrency: 3,
  downloadMbPerRequest: 16,
  uploadMbPerPost: 2,
};

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function sanitizeSettings(s: SpeedSettings): SpeedSettings {
  return {
    pingSamples: clamp(Math.round(s.pingSamples || DEFAULT_SETTINGS.pingSamples), 4, 30),
    phaseDurationMs: clamp(Math.round(s.phaseDurationMs || DEFAULT_SETTINGS.phaseDurationMs), 3000, 20000),
    downloadConcurrency: clamp(Math.round(s.downloadConcurrency || DEFAULT_SETTINGS.downloadConcurrency), 1, 8),
    uploadConcurrency: clamp(Math.round(s.uploadConcurrency || DEFAULT_SETTINGS.uploadConcurrency), 1, 6),
    downloadMbPerRequest: clamp(Math.round(s.downloadMbPerRequest || DEFAULT_SETTINGS.downloadMbPerRequest), 1, 32),
    uploadMbPerPost: clamp(Math.round(s.uploadMbPerPost || DEFAULT_SETTINGS.uploadMbPerPost), 1, 8),
  };
}

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
  const [settings, setSettings] = useState<SpeedSettings>(DEFAULT_SETTINGS);
  const [settingsUsed, setSettingsUsed] = useState<SpeedSettings>(DEFAULT_SETTINGS);
  const [completedAt, setCompletedAt] = useState<string>("");

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

  const running = phase !== "idle" && phase !== "done" && phase !== "error";

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

  const resultPayload = useMemo(
    () => ({
      completedAt,
      phase,
      settings: settingsUsed,
      summary: {
        idleLatencyMedianMs: medianLatency,
        idleJitterMedianAbsDeltaMs: jitter,
        idleLossPercent: lossPct(idleLoss, latencies.length),
        downloadMbps,
        uploadMbps,
        loadedLatencyDownloadMedianMs: loadedDownloadMedian,
        loadedLatencyUploadMedianMs: loadedUploadMedian,
        bufferbloatMs,
      },
      series: {
        downloadMbps: downloadSeries,
        uploadMbps: uploadSeries,
      },
      loss: {
        idle: { lost: idleLoss, ok: latencies.length },
        downloadLoaded: { lost: downloadLoadedLoss, ok: downloadLoadedLatencies.length },
        uploadLoaded: { lost: uploadLoadedLoss, ok: uploadLoadedLatencies.length },
      },
    }),
    [
      completedAt,
      phase,
      settingsUsed,
      medianLatency,
      jitter,
      idleLoss,
      latencies.length,
      downloadMbps,
      uploadMbps,
      loadedDownloadMedian,
      loadedUploadMedian,
      bufferbloatMs,
      downloadSeries,
      uploadSeries,
      downloadLoadedLoss,
      downloadLoadedLatencies.length,
      uploadLoadedLoss,
      uploadLoadedLatencies.length,
    ],
  );

  const hasResults = phase === "done" || phase === "error";

  const run = async () => {
    const normalized = sanitizeSettings(settings);
    setSettings(normalized);
    setSettingsUsed(normalized);

    setError("");
    setCompletedAt("");
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
      const p = await measurePing({ samples: normalized.pingSamples, timeoutMs: 1200 });
      setLatencies(p.latenciesMs);
      setIdleLoss(p.lost);

      setPhase("download");
      const d = await measureDownload({
        durationMs: normalized.phaseDurationMs,
        concurrency: normalized.downloadConcurrency,
        mbPerRequest: normalized.downloadMbPerRequest,
      });
      setDownloadMbps(d.mbps);
      setDownloadSeries(d.seriesMbps);
      setDownloadLoadedLatencies(d.loadedLatenciesMs);
      setDownloadLoadedLoss(d.loadedLost);

      setPhase("upload");
      const u = await measureUpload({
        durationMs: normalized.phaseDurationMs,
        concurrency: normalized.uploadConcurrency,
        mbPerPost: normalized.uploadMbPerPost,
      });
      setUploadMbps(u.mbps);
      setUploadSeries(u.seriesMbps);
      setUploadLoadedLatencies(u.loadedLatenciesMs);
      setUploadLoadedLoss(u.loadedLost);

      setPhase("done");
      setCompletedAt(new Date().toISOString());
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : String(e));
      setCompletedAt(new Date().toISOString());
    }
  };

  const setNumber = (k: keyof SpeedSettings, n: number) => {
    setSettings((prev) => ({ ...prev, [k]: Number.isFinite(n) ? n : (prev[k] as number) }));
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Speed Test</h1>
        <p className="max-w-3xl text-sm leading-6 text-white/65">
          Browser-first throughput test using local endpoints. Results vary by device, browser, Wi-Fi, VPN,
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-white/15 bg-black/10 px-4 py-3 text-sm font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
              onClick={() => void copyText(prettyJson(resultPayload))}
              disabled={!hasResults}
            >
              Copy JSON
            </button>
            <button
              className="rounded-xl bg-emerald-400/20 px-4 py-3 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 hover:bg-emerald-400/25 disabled:opacity-50"
              onClick={() => void run()}
              disabled={running}
            >
              {running ? "Running..." : "Run speed test"}
            </button>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 ring-1 ring-white/10">
          <summary className="cursor-pointer text-sm font-semibold text-white/85">Advanced settings</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <NumberField
              label="Ping samples"
              value={settings.pingSamples}
              min={4}
              max={30}
              step={1}
              disabled={running}
              onChange={(n) => setNumber("pingSamples", n)}
            />
            <NumberField
              label="Phase duration (ms)"
              value={settings.phaseDurationMs}
              min={3000}
              max={20000}
              step={500}
              disabled={running}
              onChange={(n) => setNumber("phaseDurationMs", n)}
            />
            <NumberField
              label="Download concurrency"
              value={settings.downloadConcurrency}
              min={1}
              max={8}
              step={1}
              disabled={running}
              onChange={(n) => setNumber("downloadConcurrency", n)}
            />
            <NumberField
              label="Upload concurrency"
              value={settings.uploadConcurrency}
              min={1}
              max={6}
              step={1}
              disabled={running}
              onChange={(n) => setNumber("uploadConcurrency", n)}
            />
            <NumberField
              label="Download MB/request"
              value={settings.downloadMbPerRequest}
              min={1}
              max={32}
              step={1}
              disabled={running}
              onChange={(n) => setNumber("downloadMbPerRequest", n)}
            />
            <NumberField
              label="Upload MB/post"
              value={settings.uploadMbPerPost}
              min={1}
              max={8}
              step={1}
              disabled={running}
              onChange={(n) => setNumber("uploadMbPerPost", n)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="rounded-full border border-white/15 bg-black/10 px-3 py-1 text-xs font-medium text-white/75 hover:bg-white/10 disabled:opacity-50"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              disabled={running}
            >
              Reset defaults
            </button>
            <span className="text-xs text-white/55">Inputs are clamped to safe ranges at run time.</span>
          </div>
        </details>

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

function NumberField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-white/65">
      <span>{label}</span>
      <input
        className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85 outline-none placeholder:text-white/30 focus:border-sky-300/40"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
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
