import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MAX_CODE_LENGTH } from "@/lib/prompt-limits";

import { useGeneratorSession } from "./use-generator-session";

const CODE = "export default function A() { return <div>a</div>; }";
const CODE2 = "export default function B() { return <div>b</div>; }";

function streamResponse(chunks: string[]): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        for (const ch of chunks) c.enqueue(enc.encode(ch));
        c.close();
      },
    }),
    { status: 200 },
  );
}

function okFetch(code: string) {
  return vi.fn(async () => streamResponse([code.slice(0, 10), code.slice(10)]));
}

function bodyOf(f: ReturnType<typeof vi.fn>, call = 0) {
  const init = f.mock.calls[call][1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe("useGeneratorSession", () => {
  it("first send streams, commits and omits currentCode", async () => {
    const f = okFetch(CODE);
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    let r: string = "";
    await act(async () => {
      r = await result.current.send("  botão  ");
    });
    expect(r).toBe("committed");
    expect(result.current.state.cursor).toBe(0);
    expect(result.current.committed?.code).toBe(CODE);
    const body = bodyOf(f);
    expect(body).toEqual({ prompt: "botão" });
    expect("currentCode" in body).toBe(false);
  });

  it("refine sends currentCode and appends version", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    let r = "";
    await act(async () => {
      r = await result.current.send("dois");
    });
    expect(r).toBe("committed");
    expect(bodyOf(f, 1).currentCode).toBe(CODE);
    expect(result.current.state.versions).toHaveLength(2);
    expect(result.current.state.cursor).toBe(1);
  });

  it.each([
    [429, "rate_limit"],
    [413, "too_large"],
    [500, "failed"],
  ])("http %i -> %s", async (status, kind) => {
    const f = vi.fn(async () => new Response("x", { status }));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    let r = "";
    await act(async () => {
      r = await result.current.send("x");
    });
    expect(r).toBe("failed");
    expect(result.current.state.error?.kind).toBe(kind);
    expect(result.current.busy).toBe(false);
  });

  it.each([
    ["rate_limited", "minute"],
    ["daily_limit", "day"],
    ["quota_exhausted", "quota"],
  ])("429 %s -> limit %s with Retry-After", async (body, limit) => {
    const f = vi.fn(
      async () =>
        new Response(body, { status: 429, headers: { "Retry-After": "30" } }),
    );
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("x");
    });
    expect(result.current.state.error).toMatchObject({
      kind: "rate_limit",
      limit,
      retryAfterSec: 30,
    });
  });

  it("stream error -> failed", async () => {
    const f = vi.fn(async () => {
      throw new Error("net");
    });
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    let r = "";
    await act(async () => {
      r = await result.current.send("x");
    });
    expect(r).toBe("failed");
    expect(result.current.state.error?.kind).toBe("failed");
  });

  it("invalid code -> failed with invalid error", async () => {
    const f = vi.fn(async () => streamResponse(["const x = 1;"]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    let r = "";
    await act(async () => {
      r = await result.current.send("x");
    });
    expect(r).toBe("failed");
    expect(result.current.state.error?.kind).toBe("invalid");
    expect(result.current.state.versions).toHaveLength(0);
  });

  it("rejects too-large currentCode without fetching", async () => {
    const big = `export default function A() { return null; }\n// ${"a".repeat(MAX_CODE_LENGTH)}`;
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([big]))
      .mockImplementation(async () => streamResponse([CODE]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    expect(f).toHaveBeenCalledTimes(1);
    let r = "";
    await act(async () => {
      r = await result.current.send("dois");
    });
    expect(r).toBe("failed");
    expect(f).toHaveBeenCalledTimes(1);
    expect(result.current.state.error?.kind).toBe("too_large");
    let r2 = "";
    await act(async () => {
      r2 = await result.current.retry();
    });
    expect(r2).toBe("ignored");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("stop aborts, keeps versions, and stale send does not affect next", async () => {
    let ctrl!: ReadableStreamDefaultController<Uint8Array>;
    const enc = new TextEncoder();
    const f = vi
      .fn()
      .mockImplementationOnce(async (_u: string, init: RequestInit) => {
        const stream = new ReadableStream<Uint8Array>({
          start(c) {
            ctrl = c;
            c.enqueue(enc.encode("export def"));
            init.signal?.addEventListener("abort", () =>
              c.error(new DOMException("aborted", "AbortError")),
            );
          },
        });
        return new Response(stream, { status: 200 });
      })
      .mockImplementationOnce(async () => streamResponse([CODE]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    let first: Promise<string>;
    act(() => {
      first = result.current.send("um");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.busy).toBe(true);
    act(() => result.current.stop());
    expect(result.current.state.pending).toBeNull();
    expect(result.current.state.versions).toHaveLength(0);
    let second = "";
    await act(async () => {
      second = await result.current.send("dois");
    });
    expect(second).toBe("committed");
    let firstResult = "";
    await act(async () => {
      firstResult = await first!;
    });
    expect(firstResult).toBe("aborted");
    expect(result.current.state.versions).toHaveLength(1);
    expect(ctrl).toBeDefined();
  });

  it("ignores blank and busy sends", async () => {
    const f = okFetch(CODE);
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    let r = "";
    await act(async () => {
      r = await result.current.send("   ");
    });
    expect(r).toBe("ignored");
    expect(f).not.toHaveBeenCalled();
  });

  it("retry re-sends the failed instruction against the same base", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => new Response("x", { status: 500 }))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    expect(result.current.state.error?.kind).toBe("failed");
    let r = "";
    await act(async () => {
      r = await result.current.retry();
    });
    expect(r).toBe("committed");
    expect(bodyOf(f, 2)).toEqual({ prompt: "dois", currentCode: CODE });
  });

  it("regenerate on v1 resends the original prompt without currentCode", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um card");
    });
    let r = "";
    await act(async () => {
      r = await result.current.regenerate();
    });
    expect(r).toBe("committed");
    expect(bodyOf(f, 1)).toEqual({ prompt: "um card" });
    expect(result.current.state.versions).toHaveLength(1);
    expect(result.current.committed?.code).toBe(CODE2);
  });

  it("regenerate on vN re-runs its instruction against the parent and replaces it", async () => {
    const CODE3 = "export default function C() { return <div>c</div>; }";
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]))
      .mockImplementationOnce(async () => streamResponse([CODE3]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    await act(async () => {
      await result.current.regenerate();
    });
    expect(bodyOf(f, 2)).toEqual({ prompt: "dois", currentCode: CODE });
    expect(result.current.state.versions.map((v) => v.code)).toEqual([
      CODE,
      CODE3,
    ]);
    expect(result.current.state.cursor).toBe(1);
  });

  it("regenerate after restoring an earlier version is a no-op (WR-01)", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    act(() => {
      result.current.restore(result.current.state.versions[0].id);
    });
    expect(result.current.canRegenerate).toBe(false);
    let r = "";
    await act(async () => {
      r = await result.current.regenerate();
    });
    expect(r).toBe("ignored");
    expect(f).toHaveBeenCalledTimes(2);
    expect(result.current.state.versions.map((v) => v.code)).toEqual([
      CODE,
      CODE2,
    ]);
    expect(result.current.state.cursor).toBe(0);
  });

  it("retry after a failed v1 regenerate stays in generate mode", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => new Response("x", { status: 500 }))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um card");
    });
    await act(async () => {
      await result.current.regenerate();
    });
    expect(result.current.state.error?.baseId).toBeNull();
    await act(async () => {
      await result.current.retry();
    });
    expect(bodyOf(f, 2)).toEqual({ prompt: "um card" });
    expect(result.current.state.versions).toHaveLength(1);
  });

  it("undo and reset dispatch; unmount aborts in-flight", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    act(() => result.current.undo());
    expect(result.current.state.cursor).toBe(0);
    act(() => result.current.reset());
    expect(result.current.state.versions).toHaveLength(0);

    let signal: AbortSignal | undefined;
    const hang = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>(() => {
          signal = init.signal as AbortSignal;
        }),
    );
    const h = renderHook(() =>
      useGeneratorSession({ fetchImpl: hang as unknown as typeof fetch }),
    );
    act(() => {
      void h.result.current.send("x");
    });
    h.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it("restore moves the cursor back and forward without dropping versions", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    const [first, second] = result.current.state.versions;
    act(() => result.current.restore(first.id));
    expect(result.current.committed?.code).toBe(CODE);
    expect(result.current.state.notice).toBe("undo");
    expect(result.current.state.versions).toHaveLength(2);
    act(() => result.current.restore(second.id));
    expect(result.current.state.notice).toBe("forward");
    expect(result.current.committed?.code).toBe(CODE2);
  });

  it("restore is ignored while a send is in flight", async () => {
    const enc = new TextEncoder();
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]))
      .mockImplementationOnce(async (_u: string, init: RequestInit) => {
        const stream = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode("export def"));
            init.signal?.addEventListener("abort", () =>
              c.error(new DOMException("aborted", "AbortError")),
            );
          },
        });
        return new Response(stream, { status: 200 });
      });
    const { result } = renderHook(() =>
      useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
    );
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    let pending: Promise<string>;
    act(() => {
      pending = result.current.send("tres");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.busy).toBe(true);
    act(() => result.current.restore(result.current.state.versions[0].id));
    expect(result.current.state.cursor).toBe(1);
    act(() => result.current.stop());
    await act(async () => {
      await pending!;
    });
    expect(result.current.state.cursor).toBe(1);
  });
});

const DRAFT = "export default function Edited() { return <div>e</div>; }";
const CODE3 = "export default function C() { return <div>c</div>; }";

function hangResponse(init: RequestInit): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode("export def"));
      init.signal?.addEventListener("abort", () =>
        c.error(new DOMException("aborted", "AbortError")),
      );
    },
  });
  return new Response(stream, { status: 200 });
}

function setup(f: ReturnType<typeof vi.fn>) {
  return renderHook(() =>
    useGeneratorSession({ fetchImpl: f as unknown as typeof fetch }),
  );
}

describe("manual drafts", () => {
  it("send with a draft commits a manual version first and refines from it", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE3]));
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    let r = "";
    await act(async () => {
      r = await result.current.send("azul", DRAFT);
    });
    expect(r).toBe("committed");
    expect(bodyOf(f, 1)).toEqual({ prompt: "azul", currentCode: DRAFT });
    const vs = result.current.state.versions;
    expect(vs.map((v) => [v.code, v.instruction, v.source])).toEqual([
      [CODE, "um", "ai"],
      [DRAFT, "", "manual"],
      [CODE3, "azul", "ai"],
    ]);
    act(() => result.current.undo());
    expect(result.current.committed?.code).toBe(DRAFT);
    expect(result.current.committed?.source).toBe("manual");
  });

  it("a blank send with a draft is ignored and commits nothing", async () => {
    const f = okFetch(CODE);
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    let r = "";
    await act(async () => {
      r = await result.current.send("   ", DRAFT);
    });
    expect(r).toBe("ignored");
    expect(f).toHaveBeenCalledTimes(1);
    expect(result.current.state.versions).toHaveLength(1);
  });

  it("a busy send with a draft is ignored and commits nothing", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async (_u: string, init: RequestInit) =>
        hangResponse(init),
      );
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    let pending: Promise<string>;
    act(() => {
      pending = result.current.send("dois");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.busy).toBe(true);
    let r = "";
    await act(async () => {
      r = await result.current.send("azul", DRAFT);
    });
    expect(r).toBe("ignored");
    expect(result.current.state.versions).toHaveLength(1);
    act(() => result.current.stop());
    await act(async () => {
      await pending!;
    });
    expect(result.current.state.versions).toHaveLength(1);
  });

  it("a draft equal to the committed code adds no manual version", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("azul", CODE);
    });
    expect(bodyOf(f, 1)).toEqual({ prompt: "azul", currentCode: CODE });
    expect(result.current.state.versions.map((v) => v.source)).toEqual([
      "ai",
      "ai",
    ]);
  });

  it("an oversized draft is kept as a manual version and rejected as too_large", async () => {
    const f = okFetch(CODE);
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    let r = "";
    await act(async () => {
      r = await result.current.send("azul", "x".repeat(MAX_CODE_LENGTH + 1));
    });
    expect(r).toBe("failed");
    expect(f).toHaveBeenCalledTimes(1);
    expect(result.current.state.versions).toHaveLength(2);
    expect(result.current.committed?.source).toBe("manual");
    expect(result.current.state.error?.kind).toBe("too_large");
    expect(result.current.state.notice).toBe("manual");
  });

  it("undo with a draft commits it then moves back to the base", async () => {
    const f = okFetch(CODE);
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    act(() => result.current.undo(DRAFT));
    const s = result.current.state;
    expect(s.versions).toHaveLength(2);
    expect(s.versions[1].source).toBe("manual");
    expect(s.cursor).toBe(0);
    expect(s.notice).toBe("undo");
    expect(s.savedManualId).toBe(s.versions[1].id);
  });

  it("restore with a draft commits it after the current version, then restores", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    const v1 = result.current.state.versions[0].id;
    act(() => result.current.restore(v1, DRAFT));
    const s = result.current.state;
    expect(s.versions.map((v) => v.code)).toEqual([CODE, CODE2, DRAFT]);
    expect(s.versions[2].source).toBe("manual");
    expect(s.cursor).toBe(0);
  });

  it("restore of the current version with a draft commits it and returns to the base", async () => {
    const f = okFetch(CODE);
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    const v1 = result.current.state.versions[0].id;
    act(() => result.current.restore(v1, DRAFT));
    const s = result.current.state;
    expect(s.versions).toHaveLength(2);
    expect(s.versions[1].source).toBe("manual");
    expect(s.cursor).toBe(0);
  });

  it("retry with a draft commits it and re-sends the failed instruction from it", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => new Response("x", { status: 500 }))
      .mockImplementationOnce(async () => streamResponse([CODE3]));
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    expect(result.current.state.error?.kind).toBe("failed");
    let r = "";
    await act(async () => {
      r = await result.current.retry(DRAFT);
    });
    expect(r).toBe("committed");
    expect(bodyOf(f, 2)).toEqual({ prompt: "dois", currentCode: DRAFT });
    const vs = result.current.state.versions;
    expect(vs.map((v) => v.source)).toEqual(["ai", "manual", "ai"]);
    expect(vs[1].code).toBe(DRAFT);
    expect(vs[2].code).toBe(CODE3);
  });

  it("non-string drafts (e.g. a click event) never commit a manual version", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => streamResponse([CODE2]));
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois");
    });
    act(() => result.current.undo({ type: "click" } as unknown as string));
    expect(result.current.state.versions).toHaveLength(2);
    expect(result.current.state.cursor).toBe(0);
    act(() =>
      result.current.restore(result.current.state.versions[1].id, undefined),
    );
    expect(result.current.state.versions).toHaveLength(2);
    expect(
      result.current.state.versions.every((v) => v.source === "ai"),
    ).toBe(true);
  });

  it("regenerate is ignored on a manual version", async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(async () => streamResponse([CODE]))
      .mockImplementationOnce(async () => new Response("x", { status: 500 }));
    const { result } = setup(f);
    await act(async () => {
      await result.current.send("um");
    });
    await act(async () => {
      await result.current.send("dois", DRAFT);
    });
    expect(result.current.committed?.source).toBe("manual");
    expect(result.current.canRegenerate).toBe(false);
    let r = "";
    await act(async () => {
      r = await result.current.regenerate();
    });
    expect(r).toBe("ignored");
    expect(f).toHaveBeenCalledTimes(2);
  });
});
