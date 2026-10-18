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

// Decorative 3D robot pinned to the bottom-right corner. It never takes
// clicks, so the panels underneath stay usable.
export function RobotCorner() {
  const enabled = useShowcaseEnabled();
  if (!enabled) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-0 bottom-0 z-40 h-[360px] w-[260px]"
    >
      <RobotCornerScene />
    </div>
  );
}
