import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  FALLBACK_SUGGESTIONS,
  SUGGEST_CLIENT_TIMEOUT_MS,
  SUGGEST_SERVER_BUDGET_MS,
} from "@/lib/suggest";

import { useSuggestions } from "./use-suggestions";

const S = (l: string) => ({ label: l, instruction: `Faça ${l}` });
const json = (suggestions: unknown) =>
  new Response(JSON.stringify({ suggestions }), { status: 200 });

describe("useSuggestions", () => {
  it("does nothing without current", () => {
    const f = vi.fn();
    const { result } = renderHook(() =>
      useSuggestions(null, { fetchImpl: f as unknown as typeof fetch }),
    );
    expect(result.current.suggestions).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("loads then returns exactly 4 items, posting {code}", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const f = vi.fn(async (..._a: unknown[]) => json([S("A"), S("B")]));
    const { result } = renderHook(() =>
      useSuggestions(
        { id: 1, code: "c1" },
        { fetchImpl: f as unknown as typeof fetch },
      ),
    );
    expect(result.current.suggestions).toBeNull();
    await waitFor(() => expect(result.current.suggestions).not.toBeNull());
    expect(result.current.suggestions).toHaveLength(4);
    expect(result.current.suggestions![0].label).toBe("A");
    expect(f.mock.calls[0][0]).toBe("/api/suggest");
    const init = f.mock.calls[0][1] as unknown as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ code: "c1" });
  });

  it.each([
    ["non-ok", async () => new Response("x", { status: 500 })],
    [
      "network error",
      async () => {
        throw new Error("net");
      },
    ],
    ["malformed json", async () => new Response("not json", { status: 200 })],
  ])("falls back silently on %s", async (_n, impl) => {
    const f = vi.fn(impl);
    const { result } = renderHook(() =>
      useSuggestions(
        { id: 1, code: "c" },
        { fetchImpl: f as unknown as typeof fetch },
      ),
    );
    await waitFor(() =>
      expect(result.current.suggestions).toEqual(FALLBACK_SUGGESTIONS),
    );
  });

  it("falls back on timeout", async () => {
    vi.useFakeTimers();
    try {
      const f = vi.fn(
        (_u: string, init: RequestInit) =>
          new Promise<Response>((_res, rej) => {
            init.signal?.addEventListener("abort", () =>
              rej(new DOMException("aborted", "AbortError")),
            );
          }),
      );
      const { result } = renderHook(() =>
        useSuggestions(
          { id: 1, code: "c" },
          { fetchImpl: f as unknown as typeof fetch },
        ),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SUGGEST_CLIENT_TIMEOUT_MS + 1);
      });
      expect(result.current.suggestions).toEqual(FALLBACK_SUGGESTIONS);
    } finally {
      vi.useRealTimers();
    }
  });

  it("client timeout outlasts the server model-chain budget", () => {
    expect(SUGGEST_CLIENT_TIMEOUT_MS).toBeGreaterThan(SUGGEST_SERVER_BUDGET_MS);
  });

  it("a timeout fallback is provisional: revisiting the version refetches", async () => {
    vi.useFakeTimers();
    try {
      let hang = true;
      const f = vi.fn((_u: string, init: RequestInit) =>
        hang
          ? new Promise<Response>((_res, rej) => {
              init.signal?.addEventListener("abort", () =>
                rej(new DOMException("aborted", "AbortError")),
              );
            })
          : Promise.resolve(json([S("Real")])),
      );
      const { result, rerender } = renderHook(
        ({ cur }: { cur: { id: number; code: string } }) =>
          useSuggestions(cur, { fetchImpl: f as unknown as typeof fetch }),
        { initialProps: { cur: { id: 1, code: "c1" } } },
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SUGGEST_CLIENT_TIMEOUT_MS + 1);
      });
      expect(result.current.suggestions).toEqual(FALLBACK_SUGGESTIONS);

      hang = false;
      rerender({ cur: { id: 2, code: "c2" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      rerender({ cur: { id: 1, code: "c1" } });
      // Fallback stays visible while the refetch runs (no skeleton flash).
      expect(result.current.suggestions).toEqual(FALLBACK_SUGGESTIONS);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(f).toHaveBeenCalledTimes(3);
      expect(result.current.suggestions![0].label).toBe("Real");

      // A real answer is cached for good.
      rerender({ cur: { id: 2, code: "c2" } });
      rerender({ cur: { id: 1, code: "c1" } });
      expect(f).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("late id-1 response never fills id-2 slot; cached id is not refetched", async () => {
    const resolvers: Record<string, (r: Response) => void> = {};
    const signals: Record<string, AbortSignal> = {};
    const f = vi.fn((_u: string, init: RequestInit) => {
      const code = JSON.parse(init.body as string).code as string;
      signals[code] = init.signal as AbortSignal;
      return new Promise<Response>((res) => {
        resolvers[code] = res;
      });
    });
    const { result, rerender } = renderHook(
      ({ cur }: { cur: { id: number; code: string } }) =>
        useSuggestions(cur, { fetchImpl: f as unknown as typeof fetch }),
      { initialProps: { cur: { id: 1, code: "c1" } } },
    );
    rerender({ cur: { id: 2, code: "c2" } });
    expect(signals.c1.aborted).toBe(true);
    await act(async () => {
      resolvers.c1(json([S("Velho")]));
      await Promise.resolve();
    });
    expect(result.current.suggestions).toBeNull();
    await act(async () => {
      resolvers.c2(json([S("Novo")]));
    });
    await waitFor(() => expect(result.current.suggestions).not.toBeNull());
    expect(result.current.suggestions![0].label).toBe("Novo");

    const calls = f.mock.calls.length;
    rerender({ cur: { id: 1, code: "c1" } });
    expect(f.mock.calls.length).toBe(calls);
    expect(result.current.suggestions![0].label).toBe("Velho");
  });

  it("reset clears the cache", async () => {
    const f = vi.fn(async () => json([S("A")]));
    const { result } = renderHook(() =>
      useSuggestions(
        { id: 1, code: "c" },
        { fetchImpl: f as unknown as typeof fetch },
      ),
    );
    await waitFor(() => expect(result.current.suggestions).not.toBeNull());
    act(() => result.current.reset());
    expect(result.current.suggestions).toBeNull();
  });
});
