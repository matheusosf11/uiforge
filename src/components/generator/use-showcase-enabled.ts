"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";


// The 3D scene only runs in the dark theme on desktop with motion allowed, so
// light theme, phones and reduced-motion users never download the runtime.
export function useShowcaseEnabled(minWidth = 768): boolean {
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
  return matches && resolvedTheme === "dark";
}
