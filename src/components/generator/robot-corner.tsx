"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Bot, EyeOff } from "lucide-react";
import { useShowcaseEnabled } from "@/components/generator/use-showcase-enabled";
import type { RobotGesture } from "@/components/generator/robot-corner-scene";
import {
  ROBOT_TIPS,
  pickRandom,
  readRobotStatus,
  type RobotMood,
} from "@/components/generator/robot-status";
import { EXAMPLE_PROMPTS } from "@/lib/example-prompts";
import { FALLBACK_SUGGESTIONS } from "@/lib/suggest";
import { cn } from "@/lib/utils";

// Loaded on demand so the Spline runtime stays out of the main bundle; phones
// and reduced-motion users download nothing.
const RobotCornerScene = dynamic(
  () =>
    import("@/components/generator/robot-corner-scene").then(
      (m) => m.RobotCornerScene,
    ),
  { ssr: false },
);

// Wide screens only (2xl, 1536px+): the robot fits in the page margin instead
// of covering the prompt panel and the Gerar button.
const MIN_WIDTH = 1536;
const HIDDEN_KEY = "uiforge:robot-hidden";
const POLL_MS = 300;
const SAY_MS = 4500;
const TIP_EVERY_MS = 16000;

const AURA: Record<RobotMood, string> = {
  idle: "bg-sky-400/10",
  working: "bg-sky-400/35 animate-pulse motion-reduce:animate-none",
  done: "bg-emerald-400/35",
  error: "bg-red-500/35",
  nav: "bg-violet-400/25",
};

const GESTURE_FOR: Partial<Record<RobotMood, RobotGesture["kind"]>> = {
  done: "nod",
  error: "shake",
  nav: "turn",
};

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean) {
  try {
    window.localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    // Storage blocked: the choice just lasts for this page view.
  }
}

/** Prefills the visible prompt field the same way typing would. */
function fillPrompt(): string | null {
  const field = document.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="Prompt"], textarea[aria-label="Descreva a mudança"]',
  );
  if (!field || field.disabled) return null;
  const refine = field.getAttribute("aria-label") === "Descreva a mudança";
  const pool = refine
    ? FALLBACK_SUGGESTIONS.map((s) => s.instruction)
    : EXAMPLE_PROMPTS.map((e) => e.prompt);
  const text = pickRandom(pool, field.value || null);
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setValue?.call(field, text);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.focus();
  return text;
}

// Decorative 3D mascot pinned to the bottom-left corner. It mirrors the
// generator status (mood, gestures, speech bubble), suggests a prompt when
// clicked and can be hidden. Screen readers keep using the page's own status
// region, so the robot itself is aria-hidden except for its two buttons.
export function RobotCorner() {
  const enabled = useShowcaseEnabled(MIN_WIDTH, { anyTheme: true });
  // null until the stored choice is read, so neither state flashes first.
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [mood, setMood] = useState<RobotMood>("idle");
  const [gesture, setGesture] = useState<RobotGesture | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const sayTimer = useRef<number | null>(null);
  const lastStatus = useRef("");
  const lastTip = useRef<string | null>(null);
  const busy = mood === "working";

  useEffect(() => setHidden(readHidden()), []);

  function speak(text: string, sticky = false) {
    setSay(text);
    if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
    sayTimer.current = sticky
      ? null
      : window.setTimeout(() => setSay(null), SAY_MS);
  }

  // Follow the status region and alerts (polling keeps this layer fully
  // decoupled from the generator's React state).
  useEffect(() => {
    if (!enabled || hidden) return;
    const id = window.setInterval(() => {
      const region = document.querySelector('[aria-live="polite"][aria-atomic="true"]');
      const status = region?.textContent ?? "";
      const hasAlert = !!document.querySelector('[role="alert"]');
      const key = `${status}|${hasAlert}`;
      if (key === lastStatus.current) return;
      lastStatus.current = key;
      const reading = readRobotStatus(status, hasAlert);
      setMood(reading.mood);
      const kind = GESTURE_FOR[reading.mood];
      if (kind) setGesture({ kind, at: performance.now() });
      if (reading.say) speak(reading.say, reading.mood === "working");
      else setSay(null);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, hidden]);

  // Occasional tips while idle.
  useEffect(() => {
    if (!enabled || hidden || busy) return;
    const id = window.setInterval(() => {
      const tip = pickRandom(ROBOT_TIPS, lastTip.current);
      lastTip.current = tip;
      speak(tip);
    }, TIP_EVERY_MS);
    return () => window.clearInterval(id);
  }, [enabled, hidden, busy]);

  useEffect(
    () => () => {
      if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
    },
    [],
  );

  if (!enabled || hidden === null) return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          setHidden(false);
          writeHidden(false);
        }}
        className="fixed bottom-4 left-16 z-40 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Mostrar robô"
        title="Mostrar robô"
      >
        <Bot aria-hidden="true" className="size-5" />
      </button>
    );
  }

  function handleClick() {
    setGesture({ kind: "hop", at: performance.now() });
    if (busy) {
      speak("Estou ocupado gerando… já já te ajudo!");
      return;
    }
    const text = fillPrompt();
    speak(text ? `Que tal: “${text}”?` : "Não achei o campo de prompt.");
  }

  return (
    <div className="fixed bottom-0 left-0 z-40 h-[360px] w-[190px]">
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-6 left-1/2 h-48 w-40 -translate-x-1/2 rounded-full blur-3xl transition-colors duration-700",
          AURA[mood],
        )}
      />
      {say ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%-2.5rem)] left-3 w-[176px] rounded-xl border border-border bg-card/90 px-3 py-2 text-xs text-card-foreground shadow-md backdrop-blur-sm"
        >
          {say}
          <span className="absolute -bottom-1.5 left-10 size-3 rotate-45 border-r border-b border-border bg-card/90" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setGesture({ kind: "hop", at: performance.now() })}
        className="absolute inset-0 cursor-pointer rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Sugerir um prompt"
        title="Clique para eu sugerir um prompt"
      >
        <RobotCornerScene mood={mood} gesture={gesture} />
      </button>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          writeHidden(true);
          setSay(null);
        }}
        className="absolute top-12 right-1 inline-flex size-7 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Esconder robô"
        title="Esconder robô"
      >
        <EyeOff aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}
