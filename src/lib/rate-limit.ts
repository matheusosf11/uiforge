// Per-IP sliding-window rate limiter (D-08).
//
// D-09: state lives in memory of a single serverless instance, so this is
// best-effort only. Instances do not share counters and cold starts reset
// them. Distributed limiting (PLAT-01, e.g. Upstash) stays in v2.

export type RateLimitConfig = { max: number; windowMs: number };
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MS = 60_000;
// Hard cap on tracked keys: bounds memory and the O(n) sweep (WR-02).
const MAX_KEYS = 5000;
const OVERFLOW_KEY = "__overflow__";

const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now(),
): RateLimitResult {
  if (hits.size >= MAX_KEYS) {
    for (const [k, list] of hits) {
      if (list.every((t) => t <= now - config.windowMs)) hits.delete(k);
    }
    // Still full of live windows: new keys share one bucket instead of growing the map.
    if (!hits.has(key) && hits.size >= MAX_KEYS) key = OVERFLOW_KEY;
  }

  const recent = (hits.get(key) ?? []).filter((t) => t > now - config.windowMs);
  if (recent.length >= config.max) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((recent[0] + config.windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true };
}

// Forwarded headers are client-controlled unless a trusted proxy overwrites
// them, so they are only honoured on Vercel. Elsewhere every request shares the
// "unknown" bucket (conservative; see README trade-offs).
export function clientIp(req: Request): string {
  if (!process.env.VERCEL) return "unknown";
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) || fallback : fallback;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    max: positiveInt(process.env.RATE_LIMIT_MAX, DEFAULT_MAX),
    windowMs: positiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
  };
}

// Separate bucket config for /api/suggest (D-05); callers use a "suggest:" key prefix.
export function getSuggestRateLimitConfig(): RateLimitConfig {
  return {
    max: positiveInt(process.env.SUGGEST_RATE_LIMIT_MAX, 10),
    windowMs: positiveInt(process.env.SUGGEST_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
  };
}

export function __resetRateLimit(): void {
  hits.clear();
}
