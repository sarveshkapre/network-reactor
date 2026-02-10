# Network Reactor: plan

Build a suite of fast, minimal, modern “internet diagnostics” tools with a product-level UX and nerd-level detail.

This repo implements all four tools in one codebase (single deployment). If needed later, each tool can be split into a dedicated service/repo.

## Product shape

One web app with four tools:
- Page Load Lab: URL in -> performance story out (Core Web Vitals + “why slow?”).
- My IP: “what the server sees” + safe enrichment (ASN/prefix/rDNS) + export.
- BGP Explorer: search IP/prefix/ASN -> ownership/routing context + routing/security posture.
- Speed Test: download/upload/latency/jitter + stability view (browser-first).

## Design principles

- Minimal UI, dense information: show the answer immediately, then expandable nerd mode.
- Evidence-first: every claim includes a timestamp and a data source label.
- Privacy-first defaults: avoid long-term IP logging; clearly label approximation.
- Robust over clever: bounded timeouts, graceful degradation, clear error messages.

## Tool 1: Page Load Lab (perf + metadata + “why slow?”)

Build it as a “single URL in, full story out” profiler.

### Core UX
- One input: URL.
- Output: a timeline + a ranked “biggest causes of slowness” list with concrete fixes.
- Compare runs mode (before/after, different locations/devices) later.

### What it measures (target spec)
- Navigation timing: DNS, TCP, TLS, TTFB, download, DOMContentLoaded, load, LCP/INP/CLS.
- Full request waterfall: every request, headers, size, cache, timing.
- Render blockers: CSS/JS blocking, main-thread long tasks, unused JS/CSS, layout shifts.
- Third-party impact: tag managers, analytics, ads.
- Fonts/images: font loading strategy, image formats and sizes.
- Caching/CDN: cache-control, etag, age, CDN headers, compression (br/gzip), HTTP/2 or HTTP/3, QUIC.
- Security/transport: TLS version/ciphers, HSTS, cert chain issues, mixed content.

### “Why is this slow?” engine (target spec)
- A rules/scoring layer translating metrics into reasons:
  - TTFB high: origin slow, missing CDN, backend latency, cold starts.
  - DNS slow: no local resolver, too many lookups, missing preconnect.
  - TLS slow: no session resumption, handshake retries, chain issues.
  - Render blocked: large sync JS, CSS not split, fonts blocking.
  - Payload heavy: unoptimized images, huge JS bundles, no compression.
- Each reason links to: evidence + recommended fixes + expected impact.

### How to build (stack + approach)
- Frontend: minimal, fast UI (Next.js) with a waterfall view and diffing.
- Backend: job queue + workers.
  - Use real browsers for fidelity (Playwright/Chromium) to capture traces/HAR.
  - Optional: run from multiple regions via hosted runners.
- Store: run artifacts (HAR/trace/summary JSON) in object storage.

### Differentiators
- One-click fix list with PR-ready suggestions for common stacks (Next/Vite/React).
- Third-party blame report: cost of each vendor script.
- Cache readiness report: what’s cacheable, what isn’t, and why.

### V1 implementation in this repo
- Uses PageSpeed Insights API to ship a credible “why slow?” story now.
- V2+ adds the real-browser runner and waterfall.

## Tool 2: My IP (metadata-heavy, privacy-aware)

Make it the best “network identity” page: useful to users and to network nerds.

### Core UX
- Instant result: IPv4/IPv6, ASN, org, city/region (coarse), rDNS, hostname hints.
- Copy buttons + export JSON.
- Show “what the server sees” vs enrichment clearly labeled.

### Metadata to include (target spec)
- IP version, observed source IP, proxy chain hints (x-forwarded-for clearly labeled).
- ASN number/name, announced prefix, RIR (ARIN/RIPE/APNIC), abuse contact pointers (later).
- Reverse DNS (PTR).
- Geo (coarse, clearly labeled approximate).
- Connection metadata: TLS/HTTP version when available, request headers (carefully).
- DNS resolver heuristics (limited, later).
- “VPN/hosting/mobile” heuristics with confidence (later).

### How to build
- Edge/server endpoint returning server-observed JSON.
- Enrichment service mapping IP -> ASN/prefix/org (API-backed first; local DB later).
- Cache aggressively; never log user IP by default (or make explicit/opt-in).

### Differentiators
- Privacy mode (no third-party calls; minimal enrichment).
- “Explain like I’m five” vs raw nerd mode.

### Trust model (must-have)
- Server-observed fields are trusted.
- Enrichment from external APIs is untrusted and must be labeled as such.

## Tool 3: BGP / ASN / routing nerd stuff (bgp.tools-like)

This is a data product: the UI is only as good as the datasets and query model.

### Core UX
- Search accepts: IP, prefix, ASN, org name.
- Entity pages:
  - ASN page: announced prefixes, upstreams/downstreams, peers, geo distribution, IRR/RPKI, visibility.
  - Prefix page: origin ASNs, more/less specifics, ROAs, route leak suspicion.
  - IP page: covering prefix, origin ASN, path samples.
- Time travel: changes over time (announcements/withdrawals, origin changes).

### Data needed (target spec)
- BGP RIBs + updates (RouteViews, RIPE RIS).
- IRR data (where feasible).
- RPKI validated ROAs.
- PeeringDB for enrichment.
- WHOIS/RDAP for registry context.

### How to build
- Ingest pipeline:
  - Parse MRT dumps + live updates -> normalized tables.
  - Maintain time-series + current “best view” tables.
- Query layer:
  - Precompute common aggregates (top peers, prefix counts, churn).
  - Fast prefix containment queries (radix tree / trie).
- Frontend:
  - Clean, dense UI with tables + graphs + export.
  - Every claim links to evidence (data source + timestamp).

### Differentiators
- Explain routing anomalies: leak detection, sudden origin change, MOAS events.
- Security posture: RPKI coverage %, invalids, route hygiene score.
- Export: JSON/CSV + API tokens for automation.

### V1 implementation in this repo
- Uses a public BGP lookup API for fast lookups and good UX now.
- V2+ adds ingest + time travel + anomaly detection.

## Tool 4: Internet Speed Test (simple, correct, hard to cheat)

Speed tests are deceptively hard: you need good infra and careful measurement.

### Core UX
- One big start button.
- Shows: download, upload, latency, jitter, packet loss (if possible).
- Auto-select nearest server; allow manual override (later).
- Advanced view: per-connection graphs and stability over time.

### How it measures (target spec)
- Download: multiple parallel streams, ramp-up, sustained phase, discard warmup.
- Upload: same, plus careful buffering.
- Latency/jitter: repeated small pings (HTTP-based + optional WebSocket).
- Results: median/percentiles, not just one number.

### Infra (target spec)
- Many edge servers close to users (anycast helps).
- Avoid CPU bottlenecks; use kernel-optimized networking.
- Control for browser limitations; optionally provide CLI.

### Differentiators
- Stability score: how consistent throughput is over time.
- Bufferbloat indicator: latency under load vs idle.
- Troubleshooting hints: Wi‑Fi vs Ethernet, VPN detection, ISP shaping suspicion.

### V1 implementation in this repo
- Browser-first measurement using local `/api/speed/*` endpoints.
- V2+ adds multi-region servers and more rigorous methodology/visualization.

## Security/abuse considerations

- Add rate limiting (IP-based) and request size limits for speed upload.
- Strict URL validation for page-load tool (avoid SSRF in future “real browser runner” mode).
- Timeouts on all external fetches; never hang the UI.
- Clear error states and partial results when enrichment fails.

## Delivery milestones

V1:
- Minimal, clean UI shell + four pages.
- API routes for My IP, BGP lookup, PSI page load, speed endpoints.
- One local smoke path per tool.

V1.1:
- Save/share run results (page load + speed test).
- Compare runs UI.

V2:
- Real-browser runner for page load tests.
- Deeper BGP data and time travel.
