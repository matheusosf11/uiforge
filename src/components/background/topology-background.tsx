"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import TopologyField from "@/components/ui/topology-field";

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

// Site backdrop, dark theme only. Mounted only when dark and motion is
// allowed, so reduced-motion users never load the animated three.js iframe.
export function TopologyBackground() {
  const { resolvedTheme } = useTheme();
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOTION_OK);
    setMotionOk(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMotionOk(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  if (!motionOk || resolvedTheme !== "dark") return null;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <TopologyField />
    </div>
  );
}
