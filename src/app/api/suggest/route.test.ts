// @vitest-environment node
/// <reference types="vitest/globals" />
import { generateText } from "ai";
import { __resetRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { MAX_CODE_LENGTH } from "@/lib/prompt-limits";
import { MOCK_SUGGESTIONS } from "@/lib/suggest";
import { __resetSuggestCache } from "@/lib/suggest-cache";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: vi.fn() };
});
const mockFlag = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/ai/model", () => ({
  isE2EMock: () => mockFlag.on,
  getSuggestModels: () => [{ modelId: "m1" }, { modelId: "m2" }],
}));

import { POST } from "./route";

const gen = vi.mocked(generateText) as unknown as ReturnType<typeof vi.fn>;

const req = (body: unknown, raw?: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/suggest", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });

const ok = (suggestions: unknown) => ({ output: { suggestions } });

let info: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  __resetRateLimit();
  __resetSuggestCache();
  vi.unstubAllEnvs();
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
  vi.stubEnv("SUGGEST_RATE_LIMIT_MAX", "3");
  mockFlag.on = false;
  gen.mockReset();
  info = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => info.mockRestore());

describe("POST /api/suggest", () => {
  it("400 on invalid JSON, missing or blank code", async () => {
    expect((await POST(req(null, "{not json"))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ code: "   " }))).status).toBe(400);
  });

  it("413 on declared content-length, actual bytes or code length", async () => {
    const declared = await POST(req({ code: "x" }, undefined, { "content-length": "999999" }));
    expect(declared.status).toBe(413);
    const bytes = await POST(req(null, JSON.stringify({ code: "é".repeat(130_000) })));
    expect(bytes.status).toBe(413);
    const long = await POST(req({ code: "x".repeat(MAX_CODE_LENGTH + 1) }));
    expect(long.status).toBe(413);
    expect(await long.text()).toBe("code_too_large");
    expect(gen).not.toHaveBeenCalled();
  });

  it("413 does not consume quota", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(req({ code: "x".repeat(MAX_CODE_LENGTH + 1) }));
    }
    gen.mockResolvedValue(ok([{ label: "A", instruction: "a" }]));
    expect((await POST(req({ code: "c" }))).status).toBe(200);
  });

  it("429 with Retry-After after max requests, in its own bucket", async () => {
    gen.mockResolvedValue(ok([{ label: "A", instruction: "a" }]));
    for (let i = 0; i < 3; i++) {
      expect((await POST(req({ code: `c${i}` }))).status).toBe(200);
    }
    const res = await POST(req({ code: "c9" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    // The generate bucket is untouched by the suggest bucket.
    expect(checkRateLimit("unknown:minute", { max: 1, windowMs: 60_000 }).ok).toBe(true);
  });

  it("answers repeated code from the cache without the model or the limit", async () => {
    gen.mockResolvedValue(ok([{ label: "A", instruction: "a" }]));
    for (let i = 0; i < 6; i++) {
      const res = await POST(req({ code: "same" }));
      expect(res.status).toBe(200);
      expect((await res.json()).suggestions[0].label).toBe("A");
    }
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it("refuses other sites and non-JSON bodies", async () => {
    const cross = await POST(
      req({ code: "c" }, undefined, { origin: "https://evil.example", host: "localhost" }),
    );
    expect(cross.status).toBe(403);
    const form = await POST(
      new Request("http://localhost/api/suggest", { method: "POST", body: "code=c" }),
    );
    expect(form.status).toBe(415);
    expect(gen).not.toHaveBeenCalled();
  });

  it("mock mode returns deterministic suggestions without key or model call", async () => {
    mockFlag.on = true;
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    const res = await POST(req({ code: "c" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: MOCK_SUGGESTIONS });
    expect(gen).not.toHaveBeenCalled();
  });

  it("mock mode: __suggest_fail__ gives 502", async () => {
    mockFlag.on = true;
    const res = await POST(req({ code: "a __suggest_fail__ b" }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("suggest_failed");
  });

  it("__suggest_fail__ is ignored outside mock mode", async () => {
    gen.mockResolvedValue(ok([{ label: "A", instruction: "a" }]));
    expect((await POST(req({ code: "__suggest_fail__" }))).status).toBe(200);
  });

  it("500 without API key outside mock", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect((await POST(req({ code: "c" }))).status).toBe(500);
  });

  it("falls back to the second model when the first throws", async () => {
    gen
      .mockRejectedValueOnce(new Error("provider secret detail"))
      .mockResolvedValueOnce(ok([{ label: "A", instruction: "a" }]));
    const res = await POST(req({ code: "c" }));
    expect(res.status).toBe(200);
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("502 with a fixed string when all models throw", async () => {
    gen.mockRejectedValue(new Error("provider secret detail"));
    const res = await POST(req({ code: "c" }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("suggest_failed");
  });

  it("sanitizes model output (clamp, dedupe, max 4)", async () => {
    gen.mockResolvedValue(
      ok([
        { label: "L".repeat(50), instruction: "i".repeat(400) },
        { label: "dup", instruction: "1" },
        { label: "DUP", instruction: "2" },
        { label: "b", instruction: "3" },
        { label: "c", instruction: "4" },
        { label: "d", instruction: "5" },
      ]),
    );
    const { suggestions } = await (await POST(req({ code: "c" }))).json();
    expect(suggestions).toHaveLength(4);
    expect(suggestions[0].label).toHaveLength(30);
    expect(suggestions[0].instruction).toHaveLength(300);
    expect(suggestions.map((s: { label: string }) => s.label.toLowerCase())).toEqual([
      "l".repeat(30),
      "dup",
      "b",
      "c",
    ]);
  });

  it("502 when output is empty after sanitizing", async () => {
    gen.mockResolvedValue(ok([{ label: " ", instruction: " " }]));
    expect((await POST(req({ code: "c" }))).status).toBe(502);
  });

  it("logs suggest_usage with model and count, never the code", async () => {
    gen.mockResolvedValue(ok([{ label: "A", instruction: "a" }]));
    const secret = "SECRET_COMPONENT_CODE_123";
    await POST(req({ code: secret }));
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0][0]);
    expect(JSON.parse(line)).toEqual({ evt: "suggest_usage", model: "m1", count: 1 });
    expect(line).not.toContain(secret);
  });
});
