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

### 2026-02-12T20:01:47Z | Codex execution failure
- Date: 2026-02-12T20:01:47Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-network-reactor-cycle-2.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:05:14Z | Codex execution failure
- Date: 2026-02-12T20:05:14Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-network-reactor-cycle-3.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:08:42Z | Codex execution failure
- Date: 2026-02-12T20:08:42Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-network-reactor-cycle-4.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:12:08Z | Codex execution failure
- Date: 2026-02-12T20:12:08Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-network-reactor-cycle-5.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:15:44Z | Codex execution failure
- Date: 2026-02-12T20:15:44Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-network-reactor-cycle-6.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:19:13Z | Codex execution failure
- Date: 2026-02-12T20:19:13Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-network-reactor-cycle-7.log
- Commit: pending
- Confidence: medium
