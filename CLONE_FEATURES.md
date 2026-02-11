# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration
- GitHub issues (author-filtered: sarveshkapre + trusted bots)
- GitHub Actions CI history
- Bounded market scan (external web sources, untrusted)

## Candidate Features To Do

### Selected (global cycle 1, this session)
- [x] **P1: Harden IP parsing/normalization with standards-based validation (`node:net.isIP`) and stricter private/local detection** (impact: high, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [x] **P2: Add per-IP rate limits for `/api/whoami` and `/api/bgp/lookup` (with explicit `429` + `no-store`)** (impact: high, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [x] **P3: Add baseline global security headers via Next config (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`)** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [x] **P4: Speed Test UX upgrade: advanced settings (duration/concurrency/sizes/samples) with safe clamps and reset defaults** (impact: medium, effort: medium, fit: high, diff: medium, risk: low, confidence: high)
- [x] **P5: Speed Test export: add JSON result payload + copy action for support/debug workflows** (impact: medium, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [x] **P6: Extend local smoke verification for invalid-input and rate-limit paths (no external dependency)** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)

### Backlog (prioritized)
- [ ] **P7: Add `/api/health` diagnostics endpoint with version + runtime metadata** (impact: medium, effort: low, fit: medium, diff: low, risk: low, confidence: high)
- [ ] **P8: Add compact API response helper for consistent trusted error envelopes across routes** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: medium)
- [ ] **P9: Add deterministic unit tests for `ip.ts` and `rateLimit.ts` helpers** (impact: medium, effort: medium, fit: high, diff: low, risk: low, confidence: medium)
- [ ] **P10: Add BGP query normalization warnings (`AS15169` -> `15169`) and richer input hints in UI** (impact: low, effort: low, fit: medium, diff: low, risk: low, confidence: high)
- [ ] **P11: Add request timeout controls for all server-side outbound enrichment calls in one shared config** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: medium)
- [ ] **P12: Add explicit trust badges in UI cards for each data section (trusted/untrusted)** (impact: medium, effort: medium, fit: high, diff: medium, risk: low, confidence: medium)
- [ ] **P13: Add synthetic fallback for page-load demo mode when PSI quota is exceeded** (impact: medium, effort: medium, fit: medium, diff: medium, risk: medium, confidence: low)
- [ ] **P14: Add optional short-lived in-memory cache for RIPEstat lookups to reduce repeated outbound calls** (impact: medium, effort: medium, fit: medium, diff: low, risk: medium, confidence: medium)
- [ ] **P15: Add CSV export for BGP and Speed Test summaries** (impact: low, effort: low, fit: medium, diff: low, risk: low, confidence: medium)
- [ ] **P16: Add basic mobile nav for top-level sections (small-screen usability)** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [ ] **P17: Add smoke path for optional PSI endpoint when `RUN_PSI=1`** (impact: low, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [ ] **P18: Add BGP error-classification hints (upstream timeout vs invalid query)** (impact: medium, effort: low, fit: high, diff: medium, risk: low, confidence: medium)
- [ ] **P19: Add privacy-safe request logging toggle for local debugging only** (impact: low, effort: medium, fit: medium, diff: low, risk: medium, confidence: low)
- [ ] **P20: Evaluate Page Load v2 real-browser runner spike (Playwright trace + HAR prototype)** (impact: high, effort: high, fit: high, diff: high, risk: medium, confidence: low)

## Implemented
- [x] 2026-02-11 **Input hardening: standards-based IP normalization + stronger private/special IP checks for page-load guardrails**. Evidence: `src/lib/ip.ts`, `src/app/api/pageload/route.ts`, `npm run build`
- [x] 2026-02-11 **API abuse protection: added per-IP rate limits to `/api/whoami` and `/api/bgp/lookup`**. Evidence: `src/app/api/whoami/route.ts`, `src/app/api/bgp/lookup/route.ts`, `npm run smoke`
- [x] 2026-02-11 **Security headers: global baseline hardening in Next config**. Evidence: `next.config.ts`, `scripts/smoke.mjs`, `BASE_URL=http://localhost:3000 npm run smoke`
- [x] 2026-02-11 **Speed Test UX: advanced settings + JSON export/copy for reproducible diagnostics**. Evidence: `src/app/speedtest/page.tsx`, `npm run lint`, `npm run build`
- [x] 2026-02-11 **Smoke verification expansion: invalid-input, security-header, and rate-limit checks**. Evidence: `scripts/smoke.mjs`, `BASE_URL=http://localhost:3000 npm run smoke`
- [x] 2026-02-11 **README alignment: documented speed-test advanced settings and expanded smoke scope**. Evidence: `README.md`
- [x] 2026-02-10 **BGP + My IP enrichment: migrate to RIPEstat (plus RPKI checks where possible)**. Evidence: `src/app/api/bgp/lookup/route.ts`, `src/app/api/whoami/route.ts`, `npm run smoke`
- [x] 2026-02-10 **My IP: Privacy mode toggle + corrected trust labeling for reverse DNS**. Evidence: `src/app/my-ip/page.tsx`, `src/app/api/whoami/route.ts`
- [x] 2026-02-10 **Speed Test: loaded latency + bufferbloat delta + no-store headers**. Evidence: `src/app/speedtest/page.tsx`, `src/app/api/speed/*`, `npm run smoke`
- [x] 2026-02-10 **Page Load Lab: copy/export + raw toggle + per-strategy error panels**. Evidence: `src/app/page-load/page.tsx`
- [x] 2026-02-10 **API hardening: runtime set + URL validation + no-store headers**. Evidence: `src/app/api/pageload/route.ts`, `src/app/api/speed/ping/route.ts`
- [x] 2026-02-10 **BGP Explorer: copy JSON + quick example buttons**. Evidence: `src/app/bgp/page.tsx`
- [x] 2026-02-10 **DevEx: local API smoke script**. Evidence: `scripts/smoke.mjs`, `npm run smoke`
- [x] 2026-02-10 **Docs: README updated for smoke + privacy mode + PSI key**. Evidence: `README.md`

## Insights
- Gap map (current repo vs market expectations):
  - Missing: explicit health endpoint, automated unit coverage on parsing/rate-limit helpers, mobile nav for top-level routes.
  - Weak: no shared API response helper yet, no short-lived cache for repeated enrichment calls.
  - Parity: page-load PSI summary, ASN/prefix lookups, basic throughput/latency/jitter presentation.
  - Differentiator opportunities: richer trust-surface UX, route-anomaly evidence for BGP, and page-load evidence depth (trace/HAR).
- Bounded market scan notes (external/untrusted, pattern-only adaptation):
  - Speed diagnostics expectations include throughput + latency/jitter/packet-loss and latency-under-load style signals.
  - Page-load tools users expect evidence-rich output (waterfall/traces/filmstrip) even if v1 starts from API summaries.
  - BGP/IP enrichment expectations include source/timestamp labeling and route/RPKI context.
- Sources:
  - https://speed.cloudflare.com/
  - https://developers.cloudflare.com/speed/aim/
  - https://docs.webpagetest.org/getting-started/
  - https://developers.google.com/speed/docs/insights/v5/about
  - https://stat.ripe.net/docs/data_api/
  - https://about.netflix.com/news/fast-com-now-measures-latency-and-upload-speed
  - https://radar.cloudflare.com/routing

## Notes
- This file is maintained by the autonomous clone loop.
