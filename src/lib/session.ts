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

export type SessionNotice =
  | "committed"
  | "manual"
  | "undo"
  | "forward"
  | "reset"
  | null;

export type SessionState = {
  versions: Version[];
  cursor: number;
  pending: Pending | null;
  error: SessionError | null;
  nextVersionId: number;
  notice: SessionNotice;
  // Versions evicted by the MAX_VERSIONS cap; offsets display numbers so they
  // stay stable (ids are internal and never shown).
  droppedCount: number;
  // Id of the manual version committed by the last COMMIT_MANUAL, kept for one
  // follow-up action so the status can say "Edição salva como vM".
  savedManualId: number | null;
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
  | { type: "RESTORE"; versionId: number }
  // Save the user's edited code as a "manual" version (saved as-is).
  | { type: "COMMIT_MANUAL"; code: string }
  | { type: "RESET" };

export const initialSessionState: SessionState = {
  versions: [],
  cursor: -1,
  pending: null,
  error: null,
  nextVersionId: 1,
  notice: null,
  droppedCount: 0,
  savedManualId: null,
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

/** Stable 1-based display number for the version at `index`. */
export function displayNumber(droppedCount: number, index: number): number {
  return droppedCount + index + 1;
}

/** Display number of `state.versions[index]`. */
export function versionNumber(state: SessionState, index: number): number {
  return displayNumber(state.droppedCount, index);
}

/** Display number of the committed version, or null on an empty session. */
export function currentNumber(state: SessionState): number | null {
  return state.cursor < 0 ? null : versionNumber(state, state.cursor);
}

/** Display range of versions after the cursor (discarded on the next refine). */
export function laterRange(
  state: SessionState,
): { from: number; to: number } | null {
  if (state.cursor < 0 || state.cursor >= state.versions.length - 1) {
    return null;
  }
  return {
    from: versionNumber(state, state.cursor + 1),
    to: versionNumber(state, state.versions.length - 1),
  };
}

/**
 * WR-01: whether the preview "Tentar de novo" (regenerate) may run. It re-runs
 * the current version against its parent and COMMIT truncates to that parent,
 * so it is only safe when the current version is the last kept one (no later
 * versions to silently discard) and its real base still exists: a parent
 * (cursor > 0) or, at cursor 0, a true first generation (nothing evicted).
 * D-12: a manual version has no instruction to replay, so it never regenerates.
 */
export function canRegenerate(state: SessionState): boolean {
  if (state.cursor < 0 || state.cursor !== state.versions.length - 1) {
    return false;
  }
  if (committedVersion(state)?.source !== "ai") return false;
  return state.cursor > 0 || state.droppedCount === 0;
}

// Appends `version` after `kept`, applies the MAX_VERSIONS cap and moves the
// cursor to it. Shared by COMMIT (ai) and COMMIT_MANUAL.
function appendVersion(
  state: SessionState,
  kept: Version[],
  version: Version,
  notice: "committed" | "manual",
): SessionState {
  const versions = [...kept, version];
  let dropped = 0;
  while (versions.length > MAX_VERSIONS) {
    versions.shift();
    dropped++;
  }
  return {
    versions,
    cursor: versions.length - 1,
    pending: null,
    error: null,
    nextVersionId: state.nextVersionId + 1,
    notice,
    droppedCount: state.droppedCount + dropped,
    savedManualId: notice === "manual" ? version.id : null,
  };
}

// START, UNDO, RESTORE and REJECT carry the saved-manual status through
// exactly one follow-up action.
function carriedManualId(state: SessionState): number | null {
  return state.notice === "manual" ? state.savedManualId : null;
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
        savedManualId: carriedManualId(state),
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
          savedManualId: null,
        };
      }
      const baseIndex =
        pending.baseId === null
          ? -1
          : state.versions.findIndex((v) => v.id === pending.baseId);
      // IN-01: the base is gone (e.g. evicted); keep history instead of
      // treating the commit as a fresh generation that wipes it.
      if (pending.baseId !== null && baseIndex === -1) {
        return {
          ...state,
          pending: null,
          error: {
            kind: "failed",
            instruction: pending.instruction,
            baseId: pending.baseId,
          },
          notice: null,
          savedManualId: null,
        };
      }
      return appendVersion(
        state,
        state.versions.slice(0, baseIndex + 1),
        {
          id: state.nextVersionId,
          code,
          instruction: pending.instruction,
          source: "ai",
        },
        "committed",
      );
    }
    case "COMMIT_MANUAL": {
      // D-05: never while streaming. D-06: an equal draft is no draft.
      // D-10: saved as-is (no export default check); size is checked by the
      // hook before any request.
      if (state.pending !== null) return state;
      const base = committedVersion(state);
      if (!base || action.code === base.code) return state;
      return appendVersion(
        state,
        state.versions.slice(0, state.cursor + 1),
        {
          id: state.nextVersionId,
          code: action.code,
          instruction: "",
          source: "manual",
        },
        "manual",
      );
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
        savedManualId: null,
      };
    }
    case "ABORT": {
      if (!state.pending || state.pending.id !== action.id) return state;
      return {
        ...state,
        pending: null,
        error: null,
        notice: null,
        savedManualId: null,
      };
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
        notice: state.notice === "manual" ? "manual" : null,
        savedManualId: carriedManualId(state),
      };
    }
    case "UNDO": {
      if (!canUndo(state)) return state;
      return {
        ...state,
        cursor: state.cursor - 1,
        error: null,
        notice: "undo",
        savedManualId: carriedManualId(state),
      };
    }
    case "RESTORE": {
      // Later versions survive (implicit redo); truncation happens at COMMIT.
      if (state.pending !== null) return state;
      const index = state.versions.findIndex((v) => v.id === action.versionId);
      if (index === -1 || index === state.cursor) return state;
      return {
        ...state,
        cursor: index,
        error: null,
        notice: index < state.cursor ? "undo" : "forward",
        savedManualId: carriedManualId(state),
      };
    }
    case "RESET": {
      return {
        versions: [],
        cursor: -1,
        pending: null,
        error: null,
        nextVersionId: state.nextVersionId,
        notice: "reset",
        droppedCount: 0,
        savedManualId: null,
      };
    }
    default:
      return state;
  }
}
