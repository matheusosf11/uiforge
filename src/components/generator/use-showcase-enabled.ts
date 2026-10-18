"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// 3D extras only run on wide enough screens with motion allowed (and, unless
// `anyTheme`, in the dark theme), so phones and reduced-motion users never
// download the runtime.
export function useShowcaseEnabled(
  minWidth = 768,
  { anyTheme = false }: { anyTheme?: boolean } = {},
): boolean {
  const { resolvedTheme } = useTheme();
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(
      `(min-width: ${minWidth}px) and (prefers-reduced-motion: no-preference)`,
    );
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minWidth]);
  return matches && (anyTheme || resolvedTheme === "dark");
}
