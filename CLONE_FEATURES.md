# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do

### Selected For This Session (cycle 2)
- [ ] **Speed Test: add loaded-latency + packet-loss estimate + bufferbloat delta** (impact: high, effort: medium, fit: high, diff: medium, risk: medium, confidence: high)
- [ ] **BGP + My IP enrichment: migrate from `bgpview.io` to RIPEstat (provider DNS currently failing)** (impact: high, effort: medium, fit: high, diff: low, risk: medium, confidence: high)
- [ ] **My IP: add “Privacy mode” (no outbound enrichment) + fix trust labels** (impact: high, effort: low, fit: high, diff: medium, risk: low, confidence: high)
- [ ] **API hardening: set `runtime="nodejs"` on all routes; add no-store + safe headers; tighten URL validation for Page Load** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [ ] **Page Load Lab: show fetchedAt/source; add copy/export; add raw toggle** (impact: medium, effort: medium, fit: high, diff: low, risk: low, confidence: high)
- [ ] **BGP Explorer: add copy/export + clearer errors/examples** (impact: low, effort: low, fit: medium, diff: low, risk: low, confidence: high)
- [ ] **DevEx: add `scripts/smoke.mjs` for quick local API smoke while server is running** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)
- [ ] **Docs: update README with privacy mode + optional PageSpeed API key + smoke commands** (impact: medium, effort: low, fit: high, diff: low, risk: low, confidence: high)

### Not Selected (keep on backlog)
- [ ] **Speed Test: multi-region servers + nearest selection** (impact: high, effort: high, fit: high, diff: high, risk: high, confidence: low)
- [ ] **BGP Explorer v2: time travel + RPKI/IRR posture + anomaly hints** (impact: high, effort: very high, fit: high, diff: high, risk: high, confidence: low)
- [ ] **Page Load v2: real-browser runner (Playwright) + HAR/trace waterfall** (impact: high, effort: very high, fit: high, diff: high, risk: high, confidence: low)

## Implemented

## Insights
- Avoid auto-importing checklist items from `node_modules/` or other third-party code: it creates noisy/irrelevant backlog entries.

## Notes
- This file is maintained by the autonomous clone loop.
