# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

### Selected (cycle 3 session)
- [ ] **CI: add GitHub Actions workflow for `npm run lint` + `npm run build`** (impact: high, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [ ] **API abuse protection: basic per-IP rate limiting for `/api/speed/*` + `/api/pageload`** (impact: high, effort: medium, fit: high, diff: medium, risk: medium, confidence: medium)
- [ ] **API correctness: ensure `cache-control: no-store` on all API error responses + consistent JSON error shape** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [ ] **Security headers: add baseline headers for all routes (CSP-lite, frame-ancestors, referrer-policy, permissions-policy)** (impact: medium, effort: low, fit: high, diff: low, risk: medium, confidence: medium)
- [ ] **Speed Test UX: add “Copy JSON” export + tunable advanced settings with safe clamps (duration/concurrency/size)** (impact: medium, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [ ] **Verification: extend `scripts/smoke.mjs` to cover rate-limit and error paths** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)

### Not Selected (keep on backlog)
- [ ] **Speed Test: multi-region servers + nearest selection** (impact: high, effort: high, fit: high, diff: high, risk: high, confidence: low)
- [ ] **BGP Explorer v2: time travel + RPKI/IRR posture + anomaly hints** (impact: high, effort: very high, fit: high, diff: high, risk: high, confidence: low)
- [ ] **Page Load v2: real-browser runner (Playwright) + HAR/trace waterfall** (impact: high, effort: very high, fit: high, diff: high, risk: high, confidence: low)

## Implemented
- [x] 2026-02-10 **BGP + My IP enrichment: migrate to RIPEstat (plus RPKI checks where possible)**. Evidence: `src/app/api/bgp/lookup/route.ts`, `src/app/api/whoami/route.ts`, `npm run smoke`
- [x] 2026-02-10 **My IP: Privacy mode toggle + corrected trust labeling for reverse DNS**. Evidence: `src/app/my-ip/page.tsx`, `src/app/api/whoami/route.ts`
- [x] 2026-02-10 **Speed Test: loaded latency + bufferbloat delta + no-store headers**. Evidence: `src/app/speedtest/page.tsx`, `src/app/api/speed/*`, `npm run smoke`
- [x] 2026-02-10 **Page Load Lab: copy/export + raw toggle + per-strategy error panels**. Evidence: `src/app/page-load/page.tsx`
- [x] 2026-02-10 **API hardening: runtime set + URL validation + no-store headers**. Evidence: `src/app/api/pageload/route.ts`, `src/app/api/speed/ping/route.ts`
- [x] 2026-02-10 **BGP Explorer: copy JSON + quick example buttons**. Evidence: `src/app/bgp/page.tsx`
- [x] 2026-02-10 **DevEx: local API smoke script**. Evidence: `scripts/smoke.mjs`, `npm run smoke`
- [x] 2026-02-10 **Docs: README updated for smoke + privacy mode + PSI key**. Evidence: `README.md`

## Insights
- Avoid auto-importing checklist items from `node_modules/` or other third-party code: it creates noisy/irrelevant backlog entries.
- Market scan notes (untrusted external sources, links):
  - Speed tests: “loaded latency” (bufferbloat), jitter, and packet loss are baseline expectations beyond pure throughput.
  - Page load tooling parity typically includes a waterfall + repeat view + filmstrip (even if v1 starts with PSI).
  - BGP/IP enrichment needs a dependable public API; RIPEstat’s Data API provides core primitives and is globally useful.
  - Links:
    - https://speed.cloudflare.com/
    - https://developers.cloudflare.com/speed/aim/
    - https://blog.cloudflare.com/how-does-cloudflares-speed-test-really-work/
    - https://fast.com/
    - https://about.netflix.com/news/fast-com-now-measures-latency-and-upload-speed
    - https://www.webpagetest.org/
    - https://docs.webpagetest.org/getting-started/
    - https://stat.ripe.net/docs/data_api

## Notes
- This file is maintained by the autonomous clone loop.
