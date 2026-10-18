// Per-IP rate limiting (D-08).
//
// checkRateLimit is an in-memory sliding window: it lives in a single
// serverless instance, so instances do not share counters and cold starts
// reset them (D-09). limitRequest adds a shared fixed window in Upstash Redis
// when UPSTASH_REDIS_REST_URL/TOKEN are set, and falls back to memory when
// they are not or Redis does not answer in time.

export type RateLimitConfig = { max: number; windowMs: number };
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const DEFAULT_MAX = 5;
const DAY_MS = 86_400_000;
const DEFAULT_DAILY_MAX = 60;
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

// Per-IP daily budget for /api/generate: stops one client (or a script) from
// spending the whole free model quota.
export function getDailyLimitConfig(): RateLimitConfig {
  return {
    max: positiveInt(process.env.DAILY_LIMIT_MAX, DEFAULT_DAILY_MAX),
    windowMs: DAY_MS,
  };
}

export type LimitScope = "minute" | "day";
export type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; scope: LimitScope };

const REDIS_TIMEOUT_MS = 1_000;

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

// Fixed window shared by every instance: INCR the window's counter and give it
// an expiry the first time. Throws on any Redis/transport failure.
async function redisHit(
  redis: { url: string; token: string },
  key: string,
  config: RateLimitConfig,
  now: number,
  fetchImpl: typeof fetch,
): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const redisKey = `uiforge:rl:${key}:${windowStart}`;
  const res = await fetchImpl(`${redis.url}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${redis.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, String(config.windowMs), "NX"],
    ]),
    signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: unknown }[];
  const count = Number(data?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error("redis bad reply");
  if (count > config.max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((windowStart + config.windowMs - now) / 1000)),
    };
  }
  return { ok: true };
}

/**
 * Checks every bucket in order (e.g. per minute, then per day) and reports
 * the first one that is full. Uses Redis when configured, memory otherwise.
 */
export async function limitRequest(
  key: string,
  buckets: { scope: LimitScope; config: RateLimitConfig }[],
  opts: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<LimitResult> {
  const now = opts.now ?? Date.now();
  const redis = redisConfig();
  for (const { scope, config } of buckets) {
    const bucketKey = `${key}:${scope}`;
    let result: RateLimitResult | null = null;
    if (redis) {
      try {
        result = await redisHit(redis, bucketKey, config, now, opts.fetchImpl ?? fetch);
      } catch {
        // Redis down or slow: best-effort memory limiting keeps the app up.
        result = null;
      }
    }
    result ??= checkRateLimit(bucketKey, config, now);
    if (!result.ok) return { ...result, scope };
  }
  return { ok: true };
}

export function __resetRateLimit(): void {
  hits.clear();
}
