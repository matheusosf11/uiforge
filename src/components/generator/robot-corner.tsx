"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
const POLL_MS = 300;
const SAY_MS = 4500;
const TIP_EVERY_MS = 16000;
// Typing counts as active until this long after the last keystroke.
const TYPING_IDLE_MS = 700;
const PROMPT_FIELD =
  'textarea[aria-label="Prompt"], textarea[aria-label="Descreva a mudança"]';

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

/**
 * Prefills the visible prompt field the same way typing would. Returns the
 * text, "" when the field already has user text, or null when unavailable.
 */
function fillPrompt(): string | null {
  const field = document.querySelector<HTMLTextAreaElement>(PROMPT_FIELD);
  if (!field || field.disabled) return null;
  // Never overwrite what the user already typed.
  if (field.value.trim()) return "";
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
// clicked and types along while the user writes a prompt. Screen readers keep
// using the page's own status region, so the robot itself is aria-hidden
// except for its button.
export function RobotCorner() {
  const enabled = useShowcaseEnabled(MIN_WIDTH, { anyTheme: true });
  const [typing, setTyping] = useState(false);
  const [mood, setMood] = useState<RobotMood>("idle");
  const [gesture, setGesture] = useState<RobotGesture | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const sayTimer = useRef<number | null>(null);
  const lastStatus = useRef("");
  const lastTip = useRef<string | null>(null);
  const busy = mood === "working";

  // Types along while the user writes in the prompt field.
  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    const onInput = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.matches(PROMPT_FIELD)) return;
      setTyping(true);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setTyping(false), TYPING_IDLE_MS);
    };
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("input", onInput);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [enabled]);

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
    if (!enabled) return;
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
  }, [enabled]);

  // Occasional tips while idle.
  useEffect(() => {
    if (!enabled || busy) return;
    const id = window.setInterval(() => {
      const tip = pickRandom(ROBOT_TIPS, lastTip.current);
      lastTip.current = tip;
      speak(tip);
    }, TIP_EVERY_MS);
    return () => window.clearInterval(id);
  }, [enabled, busy]);

  useEffect(
    () => () => {
      if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
    },
    [],
  );

  if (!enabled) return null;

  function handleClick() {
    setGesture({ kind: "hop", at: performance.now() });
    if (busy) {
      speak("Estou ocupado gerando… já já te ajudo!");
      return;
    }
    const text = fillPrompt();
    if (text === "") speak("Seu prompt já está pronto, é só enviar!");
    else speak(text ? `Que tal: “${text}”?` : "Não achei o campo de prompt.");
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
          key={say}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%+0.25rem)] left-1 w-[184px] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
        >
          <div className="relative rounded-2xl bg-white px-3.5 py-2.5 text-[13px] leading-snug font-medium text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
            {say}
            <span className="absolute -bottom-1.5 left-20 size-3 rotate-45 rounded-[2px] bg-white" />
          </div>
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
        <RobotCornerScene mood={mood} gesture={gesture} typing={typing && !busy} />
      </button>
    </div>
  );
}
