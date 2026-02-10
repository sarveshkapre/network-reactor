# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

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
  - Speed tests: “latency under load” and packet loss are baseline expectations (Cloudflare speed test, Fast.com) and strongly increase diagnostic value.
  - Page load tooling parity typically includes a waterfall/filmstrip/repeat-view (WebPageTest) even if the first cut uses PSI.
  - BGP/IP enrichment needs a dependable public API; RIPEstat’s Data API provides core primitives and is globally useful.
  - Links:
    - https://speed.cloudflare.com/
    - https://fast.com/
    - https://www.webpagetest.org/
    - https://stat.ripe.net/docs/data_api

## Notes
- This file is maintained by the autonomous clone loop.
