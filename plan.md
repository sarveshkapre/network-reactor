# Network Reactor: plan

Build a suite of fast, minimal, modern “internet diagnostics” tools with a product-level UX and nerd-level detail.

## Product shape

One web app with four tools:
- Page Load Lab: URL in -> performance story out (Core Web Vitals + “why slow?”).
- My IP: “what the server sees” + safe enrichment (ASN/prefix/rDNS) + export.
- BGP Explorer: search IP/prefix/ASN -> ownership/routing context + RPKI posture.
- Speed Test: download/upload/latency/jitter + stability view (browser-first).

## Design principles

- Minimal UI, dense information: show the answer immediately, then expandable nerd mode.
- Evidence-first: every claim should include a timestamp and data source.
- Privacy-first defaults: avoid long-term IP logging; clearly label approximation.
- Robust over clever: bounded timeouts, graceful degradation, clear error messages.

## Tool 1: Page Load Lab

### UX
- Input URL, run test.
- Show key vitals (LCP/INP/CLS), TTFB, and a prioritized “why slow?” list.
- Compare mode (saved runs) later.

### V1 data/implementation (what this repo ships first)
- Use Google PageSpeed Insights API for a credible “why slow” explanation via audits/opportunities.
- Render:
  - Core Web Vitals summary (mobile + desktop).
  - Top opportunities with estimated savings (e.g., render blocking, image optimization).
  - Payload/requests summary, cache/compression hints when present.

### V2+
- Add real-browser tracing (Playwright) for request waterfall + CPU/main-thread long tasks.
- Multi-region runners + saved artifacts (HAR/trace) in object storage.

## Tool 2: My IP (metadata)

### UX
- Show IPv4/IPv6 (if available), and a “server-observed” JSON block.
- Enrichment section:
  - ASN/org + prefix
  - Reverse DNS (PTR)
  - Basic connection metadata (UA, accept-language, forwarded headers) with clear labels.
- Copy/export JSON.

### Trust model
- “Server observed” fields are trusted.
- Enrichment from external APIs is untrusted and must be labeled as such.
- Never copy untrusted text into instruction/policy files.

## Tool 3: BGP Explorer

### UX
- One search box: accepts IP, prefix (CIDR), or ASN.
- Entity pages/sections:
  - For IP: covering prefix + origin ASN + org.
  - For prefix: origin ASN(s), more/less specifics, RPKI status.
  - For ASN: org, prefixes, peers/upstreams (as data allows).

### V1 data/implementation
- Use a public BGP data API for lookups (fast, good UX).
- Make timestamps + sources explicit in the UI.

### V2+
- Ingest MRT dumps (RouteViews/RIPE RIS) and build a real time-travel + anomaly engine.
- Add routing hygiene scores (RPKI coverage, invalids, sudden origin changes).

## Tool 4: Speed Test (minimal, correct-ish)

### UX
- One big start button.
- Show:
  - Latency + jitter baseline
  - Download + upload throughput
  - Stability over time (sparkline/graph)
  - Bufferbloat hint (latency under load vs idle) later

### V1 method
- Download: multiple parallel streams, warmup, sustained phase, report median and peak.
- Upload: multiple POST streams to a sink endpoint, bounded by time, report throughput.
- Latency/jitter: repeated ping endpoint.

### V2+
- Multi-region servers, auto-nearest selection, anycast where possible.
- CLI client for more reliable measurements.

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

