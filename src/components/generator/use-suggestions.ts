"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FALLBACK_SUGGESTIONS,
  fillWithFallback,
  sanitizeSuggestions,
  type Suggestion,
} from "@/lib/suggest";

const SUGGEST_TIMEOUT_MS = 10_000;

export function useSuggestions(
  current: { id: number; code: string } | null,
  opts?: { fetchImpl?: typeof fetch },
) {
  const [cache, setCache] = useState<Record<number, Suggestion[]>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const fetchImplRef = useRef(opts?.fetchImpl);
  fetchImplRef.current = opts?.fetchImpl;

  const id = current?.id ?? null;
  const code = current?.code ?? null;
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    if (id === null || codeRef.current === null) return;
    if (cacheRef.current[id] !== undefined) return;

    const ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, SUGGEST_TIMEOUT_MS);
    const store = (list: Suggestion[]) =>
      setCache((prev) => (prev[id] ? prev : { ...prev, [id]: list }));

    (async () => {
      try {
        const res = await (fetchImplRef.current ?? fetch)("/api/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: codeRef.current }),
          signal: ac.signal,
        });
        if (!res.ok) {
          store(FALLBACK_SUGGESTIONS);
          return;
        }
        const data = (await res.json()) as { suggestions?: unknown };
        store(fillWithFallback(sanitizeSuggestions(data?.suggestions)));
      } catch (err) {
        const aborted =
          (err as { name?: unknown } | null)?.name === "AbortError";
        // Abort from id change/unmount: do not store. Timeout: fall back.
        if (aborted && !timedOut) return;
        store(FALLBACK_SUGGESTIONS);
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [id]);

  const reset = useCallback(() => setCache({}), []);

  return {
    suggestions: id !== null ? (cache[id] ?? null) : null,
    reset,
  };
}
