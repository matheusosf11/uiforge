// @vitest-environment node
/// <reference types="vitest/globals" />
import { APICallError } from "ai";

type Part = Record<string, unknown>;

const state: { parts: Part[]; readError?: unknown } = { parts: [] };

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: vi.fn(() => ({
      fullStream: new ReadableStream<Part>({
        pull(controller) {
          if (state.readError) {
            controller.error(state.readError);
            return;
          }
          const next = state.parts.shift();
          if (next) controller.enqueue(next);
          else controller.close();
        },
      }),
    })),
  };
});
const mockFlag = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/ai/model", () => ({
  getModel: async () => ({}),
  isE2EMock: () => mockFlag.on,
}));
vi.mock("@/lib/ai/prompt", () => ({ SYSTEM_PROMPT: "sys" }));

import { __resetRateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const api429 = () =>
  new APICallError({
    message: "quota",
    url: "u",
    requestBodyValues: {},
    statusCode: 429,
  });

function req(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
  state.parts = [];
  state.readError = undefined;
  mockFlag.on = false;
  __resetRateLimit();
});

describe("POST /api/generate", () => {
  it("429 do provider antes do primeiro token", async () => {
    state.parts = [{ type: "start" }, { type: "error", error: api429() }];
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(429);
    expect(await res.text()).toBe("rate_limited");
  });

  it("outro erro vira 502", async () => {
    state.parts = [{ type: "error", error: new Error("boom") }];
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("generate_failed");
  });

  it("stream vazio vira 502", async () => {
    state.parts = [{ type: "start" }, { type: "finish" }];
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe("generate_failed");
  });

  it("sucesso faz streaming text/plain com a sequencia real do fullStream", async () => {
    // Sequencia emitida pelo streamText do AI SDK v7: partes "neutras"
    // (text-end, finish-step, finish) chegam depois do ultimo delta.
    state.parts = [
      { type: "start" },
      { type: "start-step" },
      { type: "text-start" },
      { type: "text-delta", text: "ab" },
      { type: "text-delta", text: "cd" },
      { type: "text-end" },
      { type: "finish-step" },
      { type: "finish" },
    ];
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await res.text()).toBe("abcd");
  }, 1000);

  it("partes neutras entre deltas nao travam o stream", async () => {
    state.parts = [
      { type: "text-delta", text: "a" },
      { type: "text-end" },
      { type: "text-start" },
      { type: "text-delta", text: "b" },
      { type: "finish-step" },
      { type: "finish" },
    ];
    const res = await POST(req({ prompt: "x" }));
    expect(await res.text()).toBe("ab");
  }, 1000);

  it("read() rejeitando com 429 antes do primeiro delta", async () => {
    state.readError = api429();
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(429);
  });

  it("erro depois do primeiro delta sinaliza falha no body", async () => {
    state.parts = [
      { type: "text-delta", text: "ab" },
      { type: "text-delta", text: "cd" },
      { type: "error", error: new Error("late") },
    ];
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(200);
    await expect(res.text()).rejects.toThrow("generate_failed");
  }, 1000);

  it("prompt invalido continua 400", async () => {
    const res = await POST(req({ prompt: "" }));
    expect(res.status).toBe(400);
  });

  it("sem API key continua 500", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(500);
  });

  it("sexta requisicao do mesmo IP recebe 429 com Retry-After", async () => {
    const h = { "x-forwarded-for": "1.2.3.4" };
    for (let i = 0; i < 5; i++) {
      state.parts = [{ type: "text-delta", text: "a" }];
      const ok = await POST(req({ prompt: "x" }, h));
      expect(ok.status).not.toBe(429);
      await ok.text();
    }
    const res = await POST(req({ prompt: "x" }, h));
    expect(res.status).toBe(429);
    expect(await res.text()).toBe("rate_limited");
    expect(res.headers.get("Retry-After")).toMatch(/^[1-9]\d*$/);

    state.parts = [{ type: "text-delta", text: "a" }];
    const other = await POST(req({ prompt: "x" }, { "x-forwarded-for": "5.6.7.8" }));
    expect(other.status).not.toBe(429);
  });

  it("limite roda depois da validacao (400 nao consome)", async () => {
    const h = { "x-forwarded-for": "9.9.9.9" };
    for (let i = 0; i < 10; i++) {
      const res = await POST(req({ prompt: "" }, h));
      expect(res.status).toBe(400);
    }
  });

  it("modo mock dispensa a API key", async () => {
    mockFlag.on = true;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    state.parts = [{ type: "text-delta", text: "ok" }];
    const res = await POST(req({ prompt: "x" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
