// Per-IP sliding-window rate limiter (D-08).
//
// D-09: state lives in memory of a single serverless instance, so this is
// best-effort only. Instances do not share counters and cold starts reset
// them. Distributed limiting (PLAT-01, e.g. Upstash) stays in v2.

export type RateLimitConfig = { max: number; windowMs: number };
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MS = 60_000;
const CLEANUP_THRESHOLD = 5000;

const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now(),
): RateLimitResult {
  if (hits.size > CLEANUP_THRESHOLD) {
    for (const [k, list] of hits) {
      if (list.every((t) => t <= now - config.windowMs)) hits.delete(k);
    }
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

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real || "unknown";
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

export function __resetRateLimit(): void {
  hits.clear();
}
