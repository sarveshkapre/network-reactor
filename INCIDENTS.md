# Incidents And Learnings

## Entry Schema
- Date
- Trigger
- Impact
- Root Cause
- Fix
- Prevention Rule
- Evidence
- Commit
- Confidence

## Entries

### 2026-02-11 - BGP lookup route shadowed variable caused build failure
- Trigger: Added per-IP rate limiting in `src/app/api/bgp/lookup/route.ts`.
- Impact: `npm run build` failed locally; change was blocked from shipping until fixed.
- Root Cause: Reused identifier name `ip` for both client IP and normalized query IP in the same scope.
- Fix: Renamed client-rate-limit variable to `clientIp` and re-ran lint/build.
- Prevention Rule: After API route refactors, run full production build (not only lint) before commit.
- Evidence: Build error `the name ip is defined multiple times`; subsequent `npm run build` success.
- Commit: `35013c3`
- Confidence: high
