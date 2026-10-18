"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { hasDefaultExport } from "@/lib/has-default-export";
import { parseCode } from "@/lib/parse-code";
import { MAX_CODE_LENGTH } from "@/lib/prompt-limits";
import {
  canUndo as selectCanUndo,
  committedVersion,
  initialSessionState,
  isBusy,
  sessionReducer,
  type SessionState,
  type Version,
} from "@/lib/session";
import { streamGenerate } from "@/lib/stream-generate";

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
  const run = useCallback(
    async (text: string, base: Version | null): Promise<SendResult> => {
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
          { prompt: instruction, ...(base ? { currentCode: base.code } : {}) },
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
            dispatch({ type: "FAIL", id, kind: "rate_limit" });
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

  const send = useCallback(
    (text: string) => run(text, committedVersion(stateRef.current)),
    [run],
  );

  // Re-send the failed instruction against the base it originally targeted
  // (null base = first generation, retried without currentCode).
  const retry = useCallback(async (): Promise<SendResult> => {
    const s = stateRef.current;
    const error = s.error;
    if (!error || error.kind === "too_large") return "ignored";
    const base =
      error.baseId === null
        ? null
        : (s.versions.find((v) => v.id === error.baseId) ??
          committedVersion(s));
    return run(error.instruction, base);
  }, [run]);

  // Preview runtime-error retry: redo the committed version from its own
  // base. v1 regenerates from the original prompt without currentCode; vN
  // re-runs its instruction against the parent version, and COMMIT then
  // truncates so the broken version is replaced instead of kept. Versions
  // form a linear chain (COMMIT truncates to the base), so the parent is the
  // previous index. Trade-off: once the 20-version cap has evicted the real
  // first version, versions[0] is regenerated from its instruction alone.
  const regenerate = useCallback(async (): Promise<SendResult> => {
    const s = stateRef.current;
    const current = committedVersion(s);
    if (!current) return "ignored";
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

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);

  // The reducer ignores RESTORE while pending, so no busy check here.
  const restore = useCallback(
    (versionId: number) => dispatch({ type: "RESTORE", versionId }),
    [],
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
    send,
    retry,
    regenerate,
    stop,
    undo,
    restore,
    reset,
  };
}
