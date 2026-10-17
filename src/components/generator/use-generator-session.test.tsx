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
});
