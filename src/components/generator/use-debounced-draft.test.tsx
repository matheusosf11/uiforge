/// <reference types="vitest/globals" />
import { act, renderHook } from "@testing-library/react";
import { useDebouncedDraft } from "@/components/generator/use-debounced-draft";

type Draft = { baseId: number; code: string };

function setup(initial: Draft | null) {
  return renderHook(
    ({ value }: { value: Draft | null }) => useDebouncedDraft(value, 500),
    { initialProps: { value: initial } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedDraft", () => {
  it("shows a non-null value only after the delay", () => {
    const a = { baseId: 1, code: "a" };
    const { result } = setup(a);
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(a);
  });

  it("restarts the timer when the value changes inside the window", () => {
    const a = { baseId: 1, code: "a" };
    const b = { baseId: 1, code: "ab" };
    const { result, rerender } = setup(a);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    rerender({ value: b });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(b);
  });

  it("returns null synchronously and cancels the pending timer", () => {
    const a = { baseId: 1, code: "a" };
    const b = { baseId: 1, code: "ab" };
    const { result, rerender } = setup(a);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(a);
    rerender({ value: b });
    rerender({ value: null });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBeNull();
  });

  it("never shows a stale value after passing through null", () => {
    const a = { baseId: 1, code: "a" };
    const c = { baseId: 1, code: "c" };
    const { result, rerender } = setup(a);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ value: null });
    rerender({ value: c });
    expect(result.current).toBeNull();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(c);
  });

  it("clears the timer on unmount", () => {
    const { unmount } = setup({ baseId: 1, code: "a" });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
