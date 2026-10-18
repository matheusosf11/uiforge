"use client";

import dynamic from "next/dynamic";
import { useShowcaseEnabled } from "@/components/generator/use-showcase-enabled";

// Loaded on demand so the Spline runtime stays out of the main bundle; light
// theme, phones and reduced-motion users download nothing.
const RobotCornerScene = dynamic(
  () =>
    import("@/components/generator/robot-corner-scene").then(
      (m) => m.RobotCornerScene,
    ),
  { ssr: false },
);

// Decorative 3D robot pinned to the bottom-left corner. It never takes
// clicks, and it only shows on wide screens (2xl, 1536px+) where it fits in
// the page margin instead of covering the prompt panel and the Gerar button.
const MIN_WIDTH = 1536;
export function RobotCorner() {
  const enabled = useShowcaseEnabled(MIN_WIDTH);
  if (!enabled) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 z-40 h-[360px] w-[260px]"
    >
      <RobotCornerScene />
    </div>
  );
}
