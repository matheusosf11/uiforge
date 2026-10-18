"use client";

import { useEffect, useState } from "react";

/**
 * Trailing debounce for the draft preview (D-11). A non-null value appears
 * `ms` after the last change; null passes through on the same render so
 * discard/commit/restore/reset update the preview immediately.
 */
export function useDebouncedDraft<T>(value: T | null, ms: number): T | null {
  const [debounced, setDebounced] = useState<T | null>(null);

  // Clear the stored value during render (not in an effect) so a later
  // non-null value never shows a stale one before its own timer fires.
  if (value === null && debounced !== null) setDebounced(null);

  useEffect(() => {
    if (value === null) return;
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);

  return value === null ? null : debounced;
}
