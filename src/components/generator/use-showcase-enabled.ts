"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

// The 3D scene only runs in the dark theme on desktop with motion allowed, so
// light theme, phones and reduced-motion users never download the runtime.
export function useShowcaseEnabled(): boolean {
  const { resolvedTheme } = useTheme();
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(QUERY);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return matches && resolvedTheme === "dark";
}
