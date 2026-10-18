"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import TopologyField from "@/components/ui/topology-field";

// Site backdrop, dark theme only. Mounted only when dark so the light theme
// never loads the three.js iframe.
export function TopologyBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || resolvedTheme !== "dark") return null;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <TopologyField />
    </div>
  );
}
