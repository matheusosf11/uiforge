"use client";

import { Card } from "@/components/ui/card";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

const SCENE_URL = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export function PreviewShowcase({ text }: { text: string }) {
  return (
    <Card
      role="region"
      aria-label="Live preview"
      className="relative h-[420px] min-w-0 overflow-hidden rounded-xl border-border bg-black/[0.96]"
    >
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" />
      <div className="flex h-full">
        <div className="relative z-10 flex flex-1 flex-col justify-center p-6">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">Preview</h2>
          <p className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-3xl font-bold text-transparent">
            Seu componente ganha vida aqui
          </p>
          <p className="mt-4 max-w-xs text-sm text-neutral-300">{text}</p>
        </div>
        <div className="relative flex-1" aria-hidden="true">
          <SplineScene scene={SCENE_URL} className="h-full w-full" />
        </div>
      </div>
    </Card>
  );
}
