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

  const send = useCallback(async (text: string): Promise<SendResult> => {
    const instruction = text.trim();
    if (!instruction) return "ignored";
    if (inFlightRef.current !== null || isBusy(stateRef.current)) {
      return "ignored";
    }

    const base = committedVersion(stateRef.current);
    if (base && base.code.length > MAX_CODE_LENGTH) {
      dispatch({ type: "REJECT", kind: "too_large", instruction });
      return "failed";
    }

    const id = ++reqIdRef.current;
    const ac = new AbortController();
    acRef.current = ac;
    inFlightRef.current = id;
    dispatch({ type: "START", id, instruction });

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
        dispatch({ type: "COMMIT", id, raw: result.text });
        return valid ? "committed" : "failed";
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
  }, []);

  const retry = useCallback(async (): Promise<SendResult> => {
    const error = stateRef.current.error;
    if (!error || error.kind === "too_large") return "ignored";
    return send(error.instruction);
  }, [send]);

  const stop = useCallback(() => {
    const id = inFlightRef.current;
    if (id === null) return;
    acRef.current?.abort();
    acRef.current = null;
    inFlightRef.current = null;
    dispatch({ type: "ABORT", id });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);

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
    stop,
    undo,
    reset,
  };
}
