"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FALLBACK_SUGGESTIONS,
  fillWithFallback,
  sanitizeSuggestions,
  SUGGEST_CLIENT_TIMEOUT_MS,
  type Suggestion,
} from "@/lib/suggest";

export function useSuggestions(
  current: { id: number; code: string } | null,
  opts?: { fetchImpl?: typeof fetch },
) {
  const [cache, setCache] = useState<Record<number, Suggestion[]>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  // Version ids whose cached list is a timeout fallback. Their chips are
  // shown, but the cache entry is provisional: the next time that version
  // becomes current (undo / revisit) it is fetched again, and a real answer
  // replaces the fallback. Other failures (non-ok, 429, bad JSON) stay cached
  // to avoid hammering a failing or rate-limited endpoint.
  const provisionalRef = useRef<Set<number>>(new Set());
  const fetchImplRef = useRef(opts?.fetchImpl);
  fetchImplRef.current = opts?.fetchImpl;

  const id = current?.id ?? null;
  const code = current?.code ?? null;
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    if (id === null || codeRef.current === null) return;
    if (
      cacheRef.current[id] !== undefined &&
      !provisionalRef.current.has(id)
    ) {
      return;
    }

    const ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, SUGGEST_CLIENT_TIMEOUT_MS);
    const store = (list: Suggestion[], provisional = false) => {
      const replace = provisionalRef.current.has(id);
      if (provisional) provisionalRef.current.add(id);
      else provisionalRef.current.delete(id);
      setCache((prev) =>
        prev[id] && !replace ? prev : { ...prev, [id]: list },
      );
    };

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
        store(FALLBACK_SUGGESTIONS, timedOut);
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [id]);

  const reset = useCallback(() => {
    provisionalRef.current.clear();
    setCache({});
  }, []);

  return {
    suggestions: id !== null ? (cache[id] ?? null) : null,
    reset,
  };
}
