# Project Memory

## Objective
- Ship a clean minimal diagnostics suite (page-load, my-ip, bgp, speedtest) with strong UX, safe enrichment, and reliable local verification. See plan.md.

## Architecture Snapshot
- Next.js app router with four diagnostic pages and API routes under `src/app/api/*`.
- Best-effort enrichment uses RIPEstat from server-side routes with explicit trust labeling in payloads.
- Local smoke verification uses `scripts/smoke.mjs` against a running local server.
- In-memory per-IP rate limiter (`src/lib/rateLimit.ts`) is used for abuse control on public endpoints.

## Open Problems
- Rate limiting is per-process in-memory; multi-instance deployments need shared state (Redis/edge KV) for strong global enforcement.
- No unit test suite yet for helper logic (`ip.ts`, `rateLimit.ts`).
- No `/api/health` endpoint for lightweight uptime diagnostics.

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)
-
- 2026-02-11 | Use `node:net.isIP` for IP validation and normalize IPv4-mapped/zone-id forms before use | Prior minimal IPv6 heuristic was permissive and could accept malformed values; stricter parsing improves correctness and SSRF guard quality | `npm run build` passed; smoke validation path checks passed | 35013c3 | high | Trust: trusted (local code/tests)
- 2026-02-11 | Add rate limiting to `/api/whoami` and `/api/bgp/lookup` with explicit `429` and `no-store` headers | These routes were externally reachable without throttling, increasing abuse risk and cost | `BASE_URL=http://localhost:3000 npm run smoke` logs `rate-limit paths: ok` | 35013c3 | high | Trust: trusted (local smoke)
- 2026-02-11 | Add baseline global security headers in Next config | Low-effort hardening against framing/sniffing and weak referrer defaults | `BASE_URL=http://localhost:3000 npm run smoke` logs `security headers: ok` | 35013c3 | high | Trust: trusted (local smoke)
- 2026-02-11 | Add speed-test advanced settings + JSON copy export with safe clamps | Improves diagnostic reproducibility and supportability while bounding load from user inputs | `npm run lint`, `npm run build`, manual smoke run passed | 35013c3 | high | Trust: trusted (local commands)
- 2026-02-11 | Bounded market scan baseline: speed and diagnostics UX should expose throughput + latency/jitter/loss with evidence and clear source labels | Helps prioritize parity/differentiator work without copying implementation details | Sources captured in `CLONE_FEATURES.md` (Cloudflare Speed/AIM, WebPageTest docs, PSI docs, RIPEstat docs) | n/a | medium | Trust: untrusted (external web)
- 2026-02-10 | Migrate BGP/My-IP enrichment provider from bgpview.io to RIPEstat | `api.bgpview.io` DNS resolution failed locally; RIPEstat Data API is reachable and provides needed primitives (network-info, prefix-overview, as-overview, rpki-validation) | `curl https://api.bgpview.io/ip/8.8.8.8` failed to resolve host; `curl https://stat.ripe.net/data/network-info/data.json?resource=8.8.8.8` returned 200 with ASN/prefix | 5cceafa | high | Trust: trusted (local commands)
- 2026-02-10 | Add My IP privacy mode (no outbound enrichment + no reverse DNS) | Matches privacy-first principle and creates a reliable local-only verification path | `/api/whoami?privacy=1` returns `privacyMode.enabled=true` and skips enrichment | 5cceafa | high | Trust: trusted (local smoke)
- 2026-02-10 | Add loaded-latency + bufferbloat delta to Speed Test | Market expectation is latency under load in addition to throughput | `npm run smoke` hits speed endpoints; UI shows idle vs loaded latency | c566041 | medium | Trust: trusted (local smoke/UI)
- 2026-02-10 | Centralize JSON formatting + safe nested reads into `src/lib/json.ts` | Reduce duplicated helpers across UI pages and API routes | `npm run lint`, `npm run build` | bf142f0 | high | Trust: trusted (local commands)

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence
-
- 2026-02-11 | Build failed with `the name ip is defined multiple times` in `src/app/api/bgp/lookup/route.ts` | Introduced a local variable shadowing bug while adding client-IP rate limiting | Renamed outer variable to `clientIp` and reran lint/build | After API route edits, run `npm run build` before commit to catch parser/type regressions | 35013c3 | high
- 2026-02-10 | Local verification wrapper failed with `read-only variable: status` in zsh | Used `status=$?` (reserved/read-only in zsh) | Use `rc=$?` in shell wrappers | Avoid `status` as a shell variable name in zsh automation snippets | n/a | high

## Known Risks
- In-memory rate limiting does not coordinate across instances.
- External enrichment providers (RIPEstat, PSI) can be degraded or quota-limited; API responses are best effort.

## Next Prioritized Tasks
- P7: Add `/api/health` endpoint with version/runtime metadata.
- P9: Add deterministic unit tests for `ip.ts` and `rateLimit.ts`.
- P16: Add basic mobile nav for top-level routes.
- P8: Introduce shared API error-envelope helper to reduce drift.

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)
-
- 2026-02-11 | `npm run lint` | exit 0 | pass
- 2026-02-11 | `npm run build` | `Compiled successfully` + routes generated | pass
- 2026-02-11 | `BASE_URL=http://localhost:3000 npm run smoke` (with local `npm run dev` running) | `validation paths: ok`, `security headers: ok`, `rate-limit paths: ok`, `smoke: pass` | pass
- 2026-02-11 | `gh issue list --limit 50 --state open --json number,title,author,url,createdAt,labels` | `[]` (no open owner/bot issues) | pass
- 2026-02-11 | `gh run list --limit 5 --json ...` | run `21894167833` for commit `35013c3` completed with `success` | pass
- 2026-02-10 | `npm run lint` | exit 0 | pass
- 2026-02-10 | `npm run build` | `Compiled successfully` + routes generated | pass
- 2026-02-10 | `(npm run dev) + BASE_URL=http://localhost:3000 npm run smoke` | `smoke: pass` | pass
- 2026-02-10 | `npm run lint` | exit 0 (post-refactor `bf142f0`) | pass
- 2026-02-10 | `npm run build` | `Compiled successfully` (post-refactor `bf142f0`) | pass
- 2026-02-10 | `(npm run dev) + BASE_URL=http://localhost:3000 npm run smoke` | `smoke: pass` (post-refactor `7f4cae3`) | pass

## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.
