/// <reference types="vitest/globals" />
import {
  __resetRateLimit,
  checkRateLimit,
  clientIp,
  getRateLimitConfig,
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

  it("__resetRateLimit clears state", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("a", cfg, 0);
    __resetRateLimit();
    expect(checkRateLimit("a", cfg, 1).ok).toBe(true);
  });
});

describe("clientIp", () => {
  const mk = (headers: Record<string, string>) =>
    new Request("http://localhost/x", { headers });

  it("uses the first x-forwarded-for entry, trimmed", () => {
    expect(clientIp(mk({ "x-forwarded-for": " 1.1.1.1 , 2.2.2.2" }))).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(mk({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
  });

  it("falls back to unknown", () => {
    expect(clientIp(mk({}))).toBe("unknown");
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
