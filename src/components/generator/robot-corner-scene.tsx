"use client";

import type { Application } from "@splinetool/runtime";
import { SplineScene } from "@/components/ui/splite";

const SCENE_URL = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";
// The scene's camera frames the robot from the waist up and ignores setZoom,
// so the "Bot" object itself is scaled down and lifted to fit head to feet.
const BOT_SCALE = 0.62;
const BOT_LIFT = 120;

function prepareScene(app: Application) {
  // Transparent canvas: only the robot shows over the page.
  app.setBackgroundColor("transparent");
  const bot = app.findObjectByName("Bot");
  if (!bot) return;
  bot.scale.x *= BOT_SCALE;
  bot.scale.y *= BOT_SCALE;
  bot.scale.z *= BOT_SCALE;
  bot.position.y += BOT_LIFT;
}

export function RobotCornerScene() {
  return (
    <SplineScene scene={SCENE_URL} className="h-full w-full" onLoad={prepareScene} />
  );
}
