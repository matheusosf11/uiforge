"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { hasDefaultExport } from "@/lib/has-default-export";
import { parseCode } from "@/lib/parse-code";
import type { PromptImage } from "@/lib/prompt-image";
import { MAX_CODE_LENGTH } from "@/lib/prompt-limits";
import {
  canRegenerate as selectCanRegenerate,
  canUndo as selectCanUndo,
  committedVersion,
  initialSessionState,
  isBusy,
  type LimitKind,
  sessionReducer,
  type SessionState,
  type Version,
} from "@/lib/session";
import { streamGenerate } from "@/lib/stream-generate";

// Body text of a 429 from /api/generate (see route.ts).
function limitKind(body: string): LimitKind {
  if (body.includes("daily_limit")) return "day";
  if (body.includes("quota_exhausted")) return "quota";
  return "minute";
}

export type SendResult = "committed" | "failed" | "aborted" | "ignored";

export function useGeneratorSession(opts?: { fetchImpl?: typeof fetch }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const stateRef = useRef<SessionState>(state);
  stateRef.current = state;

  const reqIdRef = useRef(0);
  const inFlightRef = useRef<number | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const fetchImplRef = useRef(opts?.fetchImpl);
  fetchImplRef.current = opts?.fetchImpl;

  // `base` null = fresh generation ({ prompt } only, no currentCode).
  // `images` are optional visual references sent along with this request.
  const run = useCallback(
    async (
      text: string,
      base: Version | null,
      images?: readonly PromptImage[],
    ): Promise<SendResult> => {
      const instruction = text.trim();
      if (!instruction) return "ignored";
      if (inFlightRef.current !== null || isBusy(stateRef.current)) {
        return "ignored";
      }

      if (base && base.code.length > MAX_CODE_LENGTH) {
        dispatch({ type: "REJECT", kind: "too_large", instruction });
        return "failed";
      }

      const id = ++reqIdRef.current;
      const ac = new AbortController();
      acRef.current = ac;
      inFlightRef.current = id;
      dispatch({ type: "START", id, instruction, baseId: base?.id ?? null });

      try {
        const result = await streamGenerate(
          {
            prompt: instruction,
            ...(base ? { currentCode: base.code } : {}),
            ...(images && images.length > 0 ? { images } : {}),
          },
          {
            signal: ac.signal,
            fetchImpl: fetchImplRef.current,
            onText: (full) => dispatch({ type: "CHUNK", id, text: full }),
          },
        );

        if (reqIdRef.current !== id || ac.signal.aborted) return "aborted";

        if (result.ok) {
          const code = parseCode(result.text);
          const valid = code.trim() !== "" && hasDefaultExport(code);
          // Defense in depth: mirrors the reducer's IN-01 guard (a removed
          // base rejects the commit), so the shell keeps the prompt.
          const baseStillKept =
            base === null ||
            stateRef.current.versions.some((v) => v.id === base.id);
          dispatch({ type: "COMMIT", id, raw: result.text });
          return valid && baseStillKept ? "committed" : "failed";
        }
        if (result.reason === "aborted") return "aborted";
        if (result.reason === "http") {
          if (result.status === 429) {
            dispatch({
              type: "FAIL",
              id,
              kind: "rate_limit",
              limit: limitKind(result.body),
              ...(result.retryAfterSec
                ? { retryAfterSec: result.retryAfterSec }
                : {}),
            });
          } else if (
            result.status === 413 ||
            result.body.includes("code_too_large")
          ) {
            dispatch({ type: "FAIL", id, kind: "too_large" });
          } else {
            dispatch({ type: "FAIL", id, kind: "failed" });
          }
          return "failed";
        }
        dispatch({ type: "FAIL", id, kind: "failed" });
        return "failed";
      } finally {
        if (inFlightRef.current === id) {
          inFlightRef.current = null;
          acRef.current = null;
        }
      }
    },
    [],
  );

  // D-07: save an edited draft as a "manual" version before acting on it.
  // Non-strings are ignored (an onClick can still pass a MouseEvent here).
  // The ref is advanced eagerly so later calls in the same handler (run,
  // UNDO, RESTORE) see the manual version; this is safe because the reducer
  // is pure and React applies the queued actions in order, so the next render
  // recomputes exactly this state.
  const commitManual = useCallback((code: unknown): Version | null => {
    if (typeof code !== "string") return null;
    if (inFlightRef.current !== null || isBusy(stateRef.current)) return null;
    const action = { type: "COMMIT_MANUAL", code } as const;
    const next = sessionReducer(stateRef.current, action);
    if (next === stateRef.current) return null;
    stateRef.current = next;
    dispatch(action);
    return committedVersion(next);
  }, []);

  // EDIT-06: refine from the edited code. Ignored sends never commit a draft;
  // an oversized draft is committed, then run() rejects it as too_large.
  const send = useCallback(
    (
      text: string,
      draft?: string | null,
      images?: readonly PromptImage[],
    ): Promise<SendResult> => {
      if (
        !text.trim() ||
        inFlightRef.current !== null ||
        isBusy(stateRef.current)
      ) {
        return Promise.resolve("ignored");
      }
      commitManual(draft);
      return run(text, committedVersion(stateRef.current), images);
    },
    [run, commitManual],
  );

  // Re-send the failed instruction against the base it originally targeted
  // (null base = first generation, retried without currentCode). With a
  // draft, the edit is committed and becomes the base so it is never lost.
  const retry = useCallback(
    async (
      draft?: string | null,
      images?: readonly PromptImage[],
    ): Promise<SendResult> => {
      const s = stateRef.current;
      const error = s.error;
      if (!error || error.kind === "too_large") return "ignored";
      const manual = commitManual(draft);
      if (manual) return run(error.instruction, manual, images);
      const base =
        error.baseId === null
          ? null
          : (s.versions.find((v) => v.id === error.baseId) ??
            committedVersion(s));
      return run(error.instruction, base, images);
    },
    [run, commitManual],
  );

  // Preview runtime-error retry: redo the committed version from its own
  // base. v1 regenerates from the original prompt without currentCode; vN
  // re-runs its instruction against the parent version, and COMMIT then
  // truncates so the broken version is replaced instead of kept. Versions
  // form a linear chain (COMMIT truncates to the base), so the parent is the
  // previous index. WR-01: a no-op unless canRegenerate (current is the last
  // kept version and its real base exists), so it never silently discards
  // later versions nor re-runs a refine instruction as a fresh prompt once
  // the cap has evicted the real first version.
  const regenerate = useCallback(async (): Promise<SendResult> => {
    const s = stateRef.current;
    const current = committedVersion(s);
    if (!current || !selectCanRegenerate(s)) return "ignored";
    const parent = s.cursor > 0 ? (s.versions[s.cursor - 1] ?? null) : null;
    return run(current.instruction, parent);
  }, [run]);

  const stop = useCallback(() => {
    const id = inFlightRef.current;
    if (id === null) return;
    acRef.current?.abort();
    acRef.current = null;
    inFlightRef.current = null;
    dispatch({ type: "ABORT", id });
  }, []);

  const undo = useCallback(
    (draft?: string | null) => {
      commitManual(draft);
      dispatch({ type: "UNDO" });
    },
    [commitManual],
  );

  // The reducer ignores RESTORE while pending, so no busy check here.
  const restore = useCallback(
    (versionId: number, draft?: string | null) => {
      commitManual(draft);
      dispatch({ type: "RESTORE", versionId });
    },
    [commitManual],
  );

  const reset = useCallback(() => {
    if (inFlightRef.current !== null || isBusy(stateRef.current)) return;
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    return () => {
      acRef.current?.abort();
    };
  }, []);

  const committed: Version | null = committedVersion(state);

  return {
    state,
    committed,
    busy: isBusy(state),
    canUndo: selectCanUndo(state),
    canRegenerate: selectCanRegenerate(state),
    send,
    retry,
    regenerate,
    stop,
    undo,
    restore,
    reset,
  };
}
