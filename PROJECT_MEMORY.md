# Project Memory

## Objective
- Ship a clean minimal diagnostics suite (page-load, my-ip, bgp, speedtest) with strong UX, safe enrichment, and reliable local verification. See plan.md.

## Architecture Snapshot

## Open Problems

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)
-
- 2026-02-10 | Migrate BGP/My-IP enrichment provider from bgpview.io to RIPEstat | `api.bgpview.io` DNS resolution failed locally; RIPEstat Data API is reachable and provides the needed primitives (network-info, prefix-overview, as-overview, rpki-validation) | `curl https://api.bgpview.io/ip/8.8.8.8` failed to resolve host; `curl https://stat.ripe.net/data/network-info/data.json?resource=8.8.8.8` returned 200 with ASN/prefix | 5cceafa | high | Trust: trusted (local commands)
- 2026-02-10 | Add My IP “Privacy mode” (no outbound enrichment + no reverse DNS) | Matches privacy-first principle; gives a reliable local-only path for verification and avoids third-party calls on demand | `/api/whoami?privacy=1` returns `privacyMode.enabled=true` and skips enrichment | 5cceafa | high | Trust: trusted (local smoke)
- 2026-02-10 | Add loaded-latency + bufferbloat delta to Speed Test | Market expectation is “latency under load” (bufferbloat signal) in addition to throughput; improves diagnostic value | `npm run smoke` hits speed endpoints; UI shows idle vs loaded latency under download/upload | c566041 | medium | Trust: trusted (local smoke/UI)
- 2026-02-10 | Centralize JSON formatting + safe nested reads into `src/lib/json.ts` | Reduce duplicated helpers across UI pages and API routes; less drift and easier maintenance | `npm run lint`, `npm run build` | bf142f0 | high | Trust: trusted (local commands)

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence
-
- 2026-02-10 | Local verification wrapper failed with `read-only variable: status` in zsh | Used `status=$?` (reserved/read-only in zsh) | Use `rc=$?` in shell wrappers | Avoid `status` as a shell variable name in zsh automation snippets | n/a | high

## Known Risks

## Next Prioritized Tasks

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)
-
- 2026-02-10 | `npm run lint` | exit 0 | pass
- 2026-02-10 | `npm run build` | “Compiled successfully” + routes generated | pass
- 2026-02-10 | `(npm run dev) + BASE_URL=http://localhost:3000 npm run smoke` | “smoke: pass” | pass
- 2026-02-10 | `npm run lint` | exit 0 (post-refactor bf142f0) | pass
- 2026-02-10 | `npm run build` | “Compiled successfully” (post-refactor bf142f0) | pass
- 2026-02-10 | `(npm run dev) + BASE_URL=http://localhost:3000 npm run smoke` | “smoke: pass” (post-refactor 7f4cae3) | pass

## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.
