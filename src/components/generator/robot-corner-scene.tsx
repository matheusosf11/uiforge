"use client";

import { useEffect, useRef } from "react";
import type { Application, SPEObject } from "@splinetool/runtime";
import { SplineScene } from "@/components/ui/splite";
import type { RobotMood } from "@/components/generator/robot-status";

const SCENE_URL = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";
// The scene's camera frames the robot from the waist up and ignores setZoom,
// so the "Bot" object itself is scaled down and lifted to fit head to feet.
const BOT_SCALE = 0.62;
const BOT_LIFT = 120;

/** One-off gestures; `at` changes to replay the same kind. */
export type RobotGesture = { kind: "nod" | "shake" | "turn" | "hop"; at: number };

const GESTURE_MS: Record<RobotGesture["kind"], number> = {
  nod: 1400,
  shake: 1200,
  turn: 800,
  hop: 600,
};

type Joint = { obj: SPEObject; restX: number };
type Rig = {
  bot: SPEObject;
  head: SPEObject;
  baseY: number;
  arms: Joint[];
  elbows: Joint[];
  forearms: Joint[];
};

// Typing pose (radians, x axis): upper arms forward, forearms raised to chest
// height, forearms tapping out of phase like fingers on a keyboard.
const TYPE_ARM_X = -0.6;
const TYPE_ELBOW_X = -1.0;
const TYPE_FOREARM_X = -0.1;
const TAP_AMPLITUDE = 0.22;
const TAP_SPEED = 55;

function joints(app: Application, name: string): Joint[] {
  return app
    .getAllObjects()
    .filter((o) => o.name === name)
    .map((obj) => ({ obj, restX: obj.rotation.x }));
}

export function RobotCornerScene({
  mood,
  gesture,
  typing = false,
}: {
  mood: RobotMood;
  gesture: RobotGesture | null;
  /** The user is typing a prompt: the robot types along. */
  typing?: boolean;
}) {
  const rigRef = useRef<Rig | null>(null);
  const moodRef = useRef(mood);
  const gestureRef = useRef(gesture);
  const typingRef = useRef(typing);
  moodRef.current = mood;
  gestureRef.current = gesture;
  typingRef.current = typing;

  function prepareScene(app: Application) {
    // Transparent canvas: only the robot shows over the page.
    app.setBackgroundColor("transparent");
    const bot = app.findObjectByName("Bot");
    const head = app.findObjectByName("Head");
    if (!bot || !head) return;
    bot.scale.x *= BOT_SCALE;
    bot.scale.y *= BOT_SCALE;
    bot.scale.z *= BOT_SCALE;
    bot.position.y += BOT_LIFT;
    rigRef.current = {
      bot,
      head,
      baseY: bot.position.y,
      arms: joints(app, "arm"),
      elbows: joints(app, "elbow"),
      forearms: joints(app, "forearm"),
    };
  }

  // Drives the body/head on top of the scene's own idle and look-at
  // animations ("Head" and "Bot" are not touched by them).
  useEffect(() => {
    let frame = 0;
    let turn = 0;
    let headOwned = false;
    // 0..1 blend between the scene's rest arms and the typing pose.
    let typeBlend = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const rig = rigRef.current;
      if (!rig) return;
      const working = moodRef.current === "working";
      const typingNow = typingRef.current;
      // Face the panels (to the right) while working or typing.
      turn += ((working ? 0.45 : typingNow ? 0.3 : 0) - turn) * 0.08;
      let headX = working
        ? Math.sin(now / 160) * 0.08
        : typingNow
          ? 0.22 + Math.sin(now / 110) * 0.03
          : 0;
      let headY = 0;
      let ownsHead = working || typingNow;
      let botTurn = turn;
      let hop = 0;
      const g = gestureRef.current;
      if (g) {
        const p = (now - g.at) / GESTURE_MS[g.kind];
        if (p >= 0 && p < 1) {
          const fade = 1 - p;
          if (g.kind === "nod") headX = Math.sin(p * Math.PI * 4) * 0.28 * fade;
          if (g.kind === "shake") headY = Math.sin(p * Math.PI * 6) * 0.38 * fade;
          if (g.kind === "nod" || g.kind === "shake") ownsHead = true;
          if (g.kind === "turn") botTurn += Math.sin(p * Math.PI) * -0.45;
          if (g.kind === "hop") hop = Math.sin(p * Math.PI) * 28;
        }
      }
      // The scene's look-at also drives "Head": only take it over during a
      // gesture or while working, then hand it back level.
      if (ownsHead || headOwned) {
        rig.head.rotation.x = headX;
        rig.head.rotation.y = headY;
        headOwned = ownsHead;
      }
      rig.bot.rotation.y = botTurn;
      rig.bot.position.y = rig.baseY + hop;

      // Arms: the scene's own animation owns them at rest, so only write
      // while blending into/out of the typing pose.
      if (typingNow && typeBlend === 0) {
        // Rest pose = wherever the scene animation has the arms right now.
        for (const j of [...rig.arms, ...rig.elbows, ...rig.forearms]) {
          j.restX = j.obj.rotation.x;
        }
      }
      typeBlend += ((typingNow ? 1 : 0) - typeBlend) * 0.15;
      if (typeBlend > 0.01) {
        const w = typeBlend;
        const mix = (rest: number, target: number) => rest + (target - rest) * w;
        rig.arms.forEach((j) => (j.obj.rotation.x = mix(j.restX, TYPE_ARM_X)));
        rig.elbows.forEach((j) => (j.obj.rotation.x = mix(j.restX, TYPE_ELBOW_X)));
        rig.forearms.forEach((j, i) => {
          const tap = Math.sin(now / TAP_SPEED + i * Math.PI) * TAP_AMPLITUDE;
          j.obj.rotation.x = mix(j.restX, TYPE_FOREARM_X + tap);
        });
      } else if (typeBlend > 0) {
        typeBlend = 0;
        for (const j of [...rig.arms, ...rig.elbows, ...rig.forearms]) {
          j.obj.rotation.x = j.restX;
        }
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <SplineScene scene={SCENE_URL} className="h-full w-full" onLoad={prepareScene} />
  );
}
