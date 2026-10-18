import { createHash } from "node:crypto";

import type { Suggestion } from "@/lib/suggest";

// Same code, same chips: undo/redo and repeated versions are answered from
// this instance's memory instead of calling the model again. Server only.
const CACHE_MAX = 200;
const cache = new Map<string, Suggestion[]>();

export function cacheKey(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function cachedSuggestions(key: string): Suggestion[] | undefined {
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency so the oldest unused entry is evicted first.
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

export function rememberSuggestions(key: string, suggestions: Suggestion[]): void {
  cache.delete(key);
  cache.set(key, suggestions);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
}

export function __resetSuggestCache(): void {
  cache.clear();
}
