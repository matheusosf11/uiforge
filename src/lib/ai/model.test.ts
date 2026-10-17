/// <reference types="vitest/globals" />
import { MODEL_IDS, getModels, isE2EMock } from "./model";
import { FIXED_COMPONENT, REFINED_COMPONENT, createE2EMockModel } from "./mock-model";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isE2EMock", () => {
  it("is true only when UIFORGE_E2E_MOCK is 1 outside production", () => {
    vi.stubEnv("UIFORGE_E2E_MOCK", "1");
    expect(isE2EMock()).toBe(true);
  });

  it.each(["0", "true", ""])("is false for value %j", (v) => {
    vi.stubEnv("UIFORGE_E2E_MOCK", v);
    expect(isE2EMock()).toBe(false);
  });

  it("is false when unset", () => {
    vi.stubEnv("UIFORGE_E2E_MOCK", undefined);
    expect(isE2EMock()).toBe(false);
  });

  it("is false on VERCEL_ENV=production even with the flag set", () => {
    vi.stubEnv("UIFORGE_E2E_MOCK", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isE2EMock()).toBe(false);
  });
});

describe("getModels", () => {
  it("returns only the mock model in mock mode", async () => {
    vi.stubEnv("UIFORGE_E2E_MOCK", "1");
    const ms = await getModels("x");
    expect(ms).toHaveLength(1);
    expect(ms[0]).toHaveProperty("doStream");
    expect((ms[0] as { provider: string }).provider).not.toContain("google");
  });

  it("returns the google fallback chain otherwise", async () => {
    vi.stubEnv("UIFORGE_E2E_MOCK", undefined);
    const ms = await getModels("x");
    expect(ms).toHaveLength(MODEL_IDS.length);
    expect(ms.map((m) => (m as { modelId: string }).modelId)).toEqual([...MODEL_IDS]);
    for (const m of ms) expect((m as { provider: string }).provider).toContain("google");
  });
});

async function consume(prompt: string, currentCode?: string) {
  const model = createE2EMockModel(prompt, currentCode);
  const { stream } = await model.doStream({ prompt: [] } as never);
  const parts: Array<{ type: string; delta?: string }> = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value as { type: string; delta?: string });
  }
  return parts;
}

describe("mock model stream", () => {
  it("streams FIXED_COMPONENT then finishes", async () => {
    const parts = await consume("hello");
    const types = parts.map((p) => p.type);
    expect(types[0]).toBe("text-start");
    expect(types.at(-2)).toBe("text-end");
    expect(types.at(-1)).toBe("finish");
    const text = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => p.delta)
      .join("");
    expect(text).toBe(FIXED_COMPONENT);
    expect(parts.filter((p) => p.type === "text-delta").length).toBeGreaterThan(3);
  });

  it("fails mid-stream after >=2 deltas for __e2e_error__", async () => {
    const parts = await consume("please __e2e_error__");
    const types = parts.map((p) => p.type);
    expect(types[0]).toBe("text-start");
    expect(types.filter((t) => t === "text-delta").length).toBeGreaterThanOrEqual(2);
    expect(types.at(-1)).toBe("error");
    expect(types).not.toContain("text-end");
    expect(types).not.toContain("finish");
  });
});

describe("FIXED_COMPONENT", () => {
  it("is a hooks-free default-exported FixtureCard", () => {
    expect(FIXED_COMPONENT).toContain("export default function FixtureCard");
    expect(FIXED_COMPONENT).not.toMatch(/use(State|Effect|Ref|Memo)/);
    expect(FIXED_COMPONENT).toContain("className=");
  });
});

async function textOf(prompt: string, currentCode?: string) {
  const parts = await consume(prompt, currentCode);
  return parts
    .filter((p) => p.type === "text-delta")
    .map((p) => p.delta)
    .join("");
}

describe("mock model refine mode", () => {
  it("streams REFINED_COMPONENT with Refinado when currentCode is given", async () => {
    const text = await textOf("p", "const a=1");
    expect(text).toContain("Refinado");
    expect(text).toContain("export default");
    expect(text).not.toContain("EditedSeen");
    expect(REFINED_COMPONENT).toContain("Refinado");
  });

  it("includes EditedSeen when currentCode contains __edited__", async () => {
    const text = await textOf("p", "x __edited__");
    expect(text).toContain("Refinado");
    expect(text).toContain("EditedSeen");
  });

  it("still fails mid-stream for __e2e_error__ in edit mode", async () => {
    const parts = await consume("p __e2e_error__", "code");
    const types = parts.map((p) => p.type);
    expect(types.at(-1)).toBe("error");
    expect(types).not.toContain("finish");
  });

  it("generate output is unchanged without currentCode", async () => {
    expect(await textOf("p")).toBe(FIXED_COMPONENT);
  });

  it("getModels forwards currentCode to the mock", async () => {
    vi.stubEnv("UIFORGE_E2E_MOCK", "1");
    const ms = await getModels("p", "code");
    expect(ms).toHaveLength(1);
    const { stream } = await ms[0].doStream({ prompt: [] } as never);
    const reader = stream.getReader();
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const v = value as { type: string; delta?: string };
      if (v.type === "text-delta") out += v.delta;
    }
    expect(out).toContain("Refinado");
  });
});
