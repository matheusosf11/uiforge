"use client";

import * as React from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the user asked the OS to minimize motion. False on the server. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

/**
 * True while the element intersects the viewport AND the tab is visible.
 * Starts true so SSR and the first client render agree; environments without
 * IntersectionObserver (e.g. jsdom) stay "visible".
 */
export function useVisibilityPause(
  ref: React.RefObject<Element | null>,
  options: { threshold?: number } = {},
): boolean {
  const { threshold = 0 } = options;
  const [inView, setInView] = React.useState(true);
  const [tabVisible, setTabVisible] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setTabVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return inView && tabVisible;
}
