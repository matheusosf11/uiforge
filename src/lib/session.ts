import { hasDefaultExport } from "@/lib/has-default-export";
import { parseCode } from "@/lib/parse-code";

export const MAX_VERSIONS = 20;

export type Version = {
  id: number;
  code: string;
  instruction: string;
  source: "ai" | "manual";
};

export type SessionErrorKind = "failed" | "rate_limit" | "invalid" | "too_large";

export type SessionError = {
  kind: SessionErrorKind;
  instruction: string;
  baseId: number | null;
};

export type Pending = {
  id: number;
  instruction: string;
  baseId: number | null;
  text: string;
};

export type SessionNotice = "committed" | "undo" | "reset" | null;

export type SessionState = {
  versions: Version[];
  cursor: number;
  pending: Pending | null;
  error: SessionError | null;
  nextVersionId: number;
  notice: SessionNotice;
};

export type SessionAction =
  // baseId: explicit base (null = fresh generation without currentCode);
  // omitted = the committed version.
  | { type: "START"; id: number; instruction: string; baseId?: number | null }
  | { type: "CHUNK"; id: number; text: string }
  | { type: "COMMIT"; id: number; raw: string }
  | { type: "FAIL"; id: number; kind: "failed" | "rate_limit" | "too_large" }
  | { type: "ABORT"; id: number }
  | { type: "REJECT"; kind: "too_large"; instruction: string }
  | { type: "UNDO" }
  | { type: "RESET" };

export const initialSessionState: SessionState = {
  versions: [],
  cursor: -1,
  pending: null,
  error: null,
  nextVersionId: 1,
  notice: null,
};

export function committedVersion(state: SessionState): Version | null {
  return state.versions[state.cursor] ?? null;
}

export function isBusy(state: SessionState): boolean {
  return state.pending !== null;
}

export function canUndo(state: SessionState): boolean {
  return state.pending === null && state.cursor > 0;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "START": {
      if (state.pending !== null) return state;
      return {
        ...state,
        pending: {
          id: action.id,
          instruction: action.instruction,
          baseId:
            action.baseId !== undefined
              ? action.baseId
              : (committedVersion(state)?.id ?? null),
          text: "",
        },
        error: null,
        notice: null,
      };
    }
    case "CHUNK": {
      if (!state.pending || state.pending.id !== action.id) return state;
      return { ...state, pending: { ...state.pending, text: action.text } };
    }
    case "COMMIT": {
      const pending = state.pending;
      if (!pending || pending.id !== action.id) return state;
      const code = parseCode(action.raw);
      if (!code.trim() || !hasDefaultExport(code)) {
        return {
          ...state,
          pending: null,
          error: {
            kind: "invalid",
            instruction: pending.instruction,
            baseId: pending.baseId,
          },
          notice: null,
        };
      }
      const baseIndex =
        pending.baseId === null
          ? -1
          : state.versions.findIndex((v) => v.id === pending.baseId);
      const kept = state.versions.slice(0, baseIndex + 1);
      const versions = [
        ...kept,
        {
          id: state.nextVersionId,
          code,
          instruction: pending.instruction,
          source: "ai" as const,
        },
      ];
      while (versions.length > MAX_VERSIONS) versions.shift();
      return {
        versions,
        cursor: versions.length - 1,
        pending: null,
        error: null,
        nextVersionId: state.nextVersionId + 1,
        notice: "committed",
      };
    }
    case "FAIL": {
      const pending = state.pending;
      if (!pending || pending.id !== action.id) return state;
      return {
        ...state,
        pending: null,
        error: {
          kind: action.kind,
          instruction: pending.instruction,
          baseId: pending.baseId,
        },
        notice: null,
      };
    }
    case "ABORT": {
      if (!state.pending || state.pending.id !== action.id) return state;
      return { ...state, pending: null, error: null, notice: null };
    }
    case "REJECT": {
      if (state.pending !== null) return state;
      return {
        ...state,
        error: {
          kind: action.kind,
          instruction: action.instruction,
          baseId: committedVersion(state)?.id ?? null,
        },
        notice: null,
      };
    }
    case "UNDO": {
      if (!canUndo(state)) return state;
      return { ...state, cursor: state.cursor - 1, error: null, notice: "undo" };
    }
    case "RESET": {
      return {
        versions: [],
        cursor: -1,
        pending: null,
        error: null,
        nextVersionId: state.nextVersionId,
        notice: "reset",
      };
    }
    default:
      return state;
  }
}
