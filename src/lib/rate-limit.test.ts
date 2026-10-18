/// <reference types="vitest/globals" />
import {
  __resetRateLimit,
  checkRateLimit,
  clientIp,
  getRateLimitConfig,
  getSuggestRateLimitConfig,
  getDailyLimitConfig,
  limitRequest,
} from "./rate-limit";

const cfg = { max: 5, windowMs: 60_000 };

beforeEach(() => {
  __resetRateLimit();
  vi.unstubAllEnvs();
});

describe("checkRateLimit", () => {
  it("allows max hits then blocks the next", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("a", cfg, 1000 + i).ok).toBe(true);
    }
    const res = checkRateLimit("a", cfg, 1010);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("computes retryAfterSec from the oldest hit", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", cfg, 0);
    const res = checkRateLimit("a", cfg, 30_000);
    expect(res).toEqual({ ok: false, retryAfterSec: 30 });
  });

  it("slides: allows again once the oldest hit leaves the window", () => {
    checkRateLimit("a", cfg, 0);
    for (let i = 0; i < 4; i++) checkRateLimit("a", cfg, 50_000);
    expect(checkRateLimit("a", cfg, 59_999).ok).toBe(false);
    expect(checkRateLimit("a", cfg, 60_001).ok).toBe(true);
  });

  it("keeps keys independent", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", cfg, 0);
    expect(checkRateLimit("a", cfg, 1).ok).toBe(false);
    expect(checkRateLimit("b", cfg, 1).ok).toBe(true);
  });

  it("cleans stale keys lazily past 5000 entries", () => {
    for (let i = 0; i < 5001; i++) checkRateLimit(`k${i}`, cfg, 0);
    expect(checkRateLimit("fresh", cfg, 120_000).ok).toBe(true);
    // Stale keys were dropped, so an old key starts a fresh window.
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k0", cfg, 120_001).ok).toBe(true);
    }
    expect(checkRateLimit("k0", cfg, 120_002).ok).toBe(false);
  });

  it("caps tracked keys: extra live keys share one overflow bucket", () => {
    for (let i = 0; i < 5000; i++) checkRateLimit(`k${i}`, cfg, 0);
    // Map is full of live windows: spoofed new keys collapse into one bucket.
    let blocked = 0;
    for (let i = 0; i < 20; i++) {
      if (!checkRateLimit(`spoof${i}`, cfg, 1).ok) blocked++;
    }
    expect(blocked).toBe(15);
  });

  it("__resetRateLimit clears state", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", cfg, 0);
    __resetRateLimit();
    expect(checkRateLimit("a", cfg, 1).ok).toBe(true);
  });
});

describe("clientIp", () => {
  const mk = (headers: Record<string, string>) =>
    new Request("http://localhost/x", { headers });

  describe("on Vercel", () => {
    beforeEach(() => vi.stubEnv("VERCEL", "1"));

    it("prefers x-vercel-forwarded-for", () => {
      expect(
        clientIp(
          mk({
            "x-vercel-forwarded-for": "9.9.9.9",
            "x-real-ip": "3.3.3.3",
            "x-forwarded-for": "1.1.1.1",
          }),
        ),
      ).toBe("9.9.9.9");
    });

    it("then x-real-ip", () => {
      expect(
        clientIp(mk({ "x-real-ip": "3.3.3.3", "x-forwarded-for": "1.1.1.1" })),
      ).toBe("3.3.3.3");
    });

    it("then the first x-forwarded-for entry, trimmed", () => {
      expect(clientIp(mk({ "x-forwarded-for": " 1.1.1.1 , 2.2.2.2" }))).toBe("1.1.1.1");
    });

    it("falls back to unknown", () => {
      expect(clientIp(mk({}))).toBe("unknown");
    });
  });

  it("ignores spoofable forwarded headers when not on Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(
      clientIp(
        mk({
          "x-forwarded-for": "1.1.1.1",
          "x-real-ip": "3.3.3.3",
          "x-vercel-forwarded-for": "9.9.9.9",
        }),
      ),
    ).toBe("unknown");
  });
});

describe("getRateLimitConfig", () => {
  it("defaults to 5 per 60000ms", () => {
    expect(getRateLimitConfig()).toEqual({ max: 5, windowMs: 60_000 });
  });

  it("reads env overrides at call time", () => {
    vi.stubEnv("RATE_LIMIT_MAX", "10");
    vi.stubEnv("RATE_LIMIT_WINDOW_MS", "1000");
    expect(getRateLimitConfig()).toEqual({ max: 10, windowMs: 1000 });
  });

  it("falls back to defaults on NaN, zero or negative", () => {
    vi.stubEnv("RATE_LIMIT_MAX", "abc");
    vi.stubEnv("RATE_LIMIT_WINDOW_MS", "-5");
    expect(getRateLimitConfig()).toEqual({ max: 5, windowMs: 60_000 });
    vi.stubEnv("RATE_LIMIT_MAX", "0");
    expect(getRateLimitConfig().max).toBe(5);
  });
});

describe("getSuggestRateLimitConfig", () => {
  it("defaults to 10 per 60000ms", () => {
    expect(getSuggestRateLimitConfig()).toEqual({ max: 10, windowMs: 60_000 });
  });

  it("reads SUGGEST_ env overrides and ignores RATE_LIMIT_MAX", () => {
    vi.stubEnv("RATE_LIMIT_MAX", "99");
    vi.stubEnv("SUGGEST_RATE_LIMIT_MAX", "3");
    vi.stubEnv("SUGGEST_RATE_LIMIT_WINDOW_MS", "2000");
    expect(getSuggestRateLimitConfig()).toEqual({ max: 3, windowMs: 2000 });
  });
});

describe("getDailyLimitConfig", () => {
  it("defaults to 60 per day and reads DAILY_LIMIT_MAX", () => {
    expect(getDailyLimitConfig()).toEqual({ max: 60, windowMs: 86_400_000 });
    vi.stubEnv("DAILY_LIMIT_MAX", "7");
    expect(getDailyLimitConfig().max).toBe(7);
  });
});

describe("limitRequest", () => {
  const minute = { scope: "minute" as const, config: { max: 2, windowMs: 60_000 } };
  const day = { scope: "day" as const, config: { max: 3, windowMs: 86_400_000 } };

  it("uses memory without Upstash and reports which bucket is full", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const fetchImpl = vi.fn();
    const at = (now: number) => limitRequest("ip", [minute, day], { now, fetchImpl });
    expect((await at(0)).ok).toBe(true);
    expect((await at(1)).ok).toBe(true);
    expect(await at(2)).toMatchObject({ ok: false, scope: "minute" });
    expect((await at(120_000)).ok).toBe(true);
    expect(await at(240_000)).toMatchObject({ ok: false, scope: "day" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  describe("with Upstash", () => {
    beforeEach(() => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example/");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    });

    const reply = (count: number) =>
      new Response(JSON.stringify([{ result: count }, { result: 1 }]), { status: 200 });

    it("counts in a shared fixed window with INCR + PEXPIRE NX", async () => {
      const fetchImpl = vi.fn(async () => reply(1));
      const r = await limitRequest("ip", [minute], {
        now: 90_000,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(r.ok).toBe(true);
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("https://redis.example/pipeline");
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
      expect(JSON.parse(init.body as string)).toEqual([
        ["INCR", "uiforge:rl:ip:minute:60000"],
        ["PEXPIRE", "uiforge:rl:ip:minute:60000", "60000", "NX"],
      ]);
    });

    it("blocks above max until the window ends", async () => {
      const fetchImpl = vi.fn(async () => reply(3));
      const r = await limitRequest("ip", [minute], {
        now: 90_000,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(r).toEqual({ ok: false, retryAfterSec: 30, scope: "minute" });
    });

    it("falls back to memory when Redis fails or answers garbage", async () => {
      const down = vi.fn(async () => {
        throw new Error("network");
      });
      const garbage = vi.fn(async () => new Response("[]", { status: 200 }));
      const opts = (fetchImpl: unknown, now: number) => ({
        now,
        fetchImpl: fetchImpl as typeof fetch,
      });
      expect((await limitRequest("ip", [minute], opts(down, 0))).ok).toBe(true);
      expect((await limitRequest("ip", [minute], opts(garbage, 1))).ok).toBe(true);
      expect(await limitRequest("ip", [minute], opts(down, 2))).toMatchObject({
        ok: false,
        scope: "minute",
      });
    });
  });
});
