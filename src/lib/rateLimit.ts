type Bucket = { count: number; resetAtMs: number };

function getStore(): Map<string, Bucket> {
  const g = globalThis as unknown as { __nr_rl__?: Map<string, Bucket> };
  if (!g.__nr_rl__) g.__nr_rl__ = new Map();
  return g.__nr_rl__;
}

export type RateLimitResult =
  | {
      ok: true;
      limit: number;
      remaining: number;
      resetAtMs: number;
      headers: Record<string, string>;
    }
  | {
      ok: false;
      limit: number;
      remaining: 0;
      resetAtMs: number;
      headers: Record<string, string>;
    };

export function checkRateLimit(opts: { key: string; max: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(opts.key);

  let b: Bucket;
  if (!existing || now >= existing.resetAtMs) {
    b = { count: 0, resetAtMs: now + opts.windowMs };
    store.set(opts.key, b);
  } else {
    b = existing;
  }

  b.count += 1;
  const remaining = Math.max(0, opts.max - b.count);
  const resetAtSec = Math.ceil(b.resetAtMs / 1000);
  const headers = {
    "x-ratelimit-limit": String(opts.max),
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": String(resetAtSec),
  };

  if (b.count > opts.max) {
    return { ok: false, limit: opts.max, remaining: 0, resetAtMs: b.resetAtMs, headers };
  }
  return { ok: true, limit: opts.max, remaining, resetAtMs: b.resetAtMs, headers };
}

