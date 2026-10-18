import { describe, expect, it } from "vitest";
import {
  MAX_VERSIONS,
  canUndo,
  committedVersion,
  initialSessionState,
  isBusy,
  sessionReducer,
  type SessionAction,
  type SessionState,
} from "@/lib/session";

const code = (n: number) => `export default function C${n}() { return null; }`;

function run(actions: SessionAction[], from: SessionState = initialSessionState) {
  return actions.reduce(sessionReducer, from);
}

function commit(state: SessionState, id: number, raw: string, instr = "x") {
  return run(
    [
      { type: "START", id, instruction: instr },
      { type: "COMMIT", id, raw },
    ],
    state,
  );
}

describe("sessionReducer", () => {
  it("START sets pending with null base on empty session", () => {
    const s = sessionReducer(initialSessionState, {
      type: "START",
      id: 1,
      instruction: "a",
    });
    expect(s.pending).toEqual({ id: 1, instruction: "a", baseId: null, text: "" });
    expect(isBusy(s)).toBe(true);
  });

  it("START uses current version as base, clears error/notice", () => {
    const s1 = commit(initialSessionState, 1, code(1));
    const s2 = sessionReducer(s1, { type: "START", id: 2, instruction: "b" });
    expect(s2.pending?.baseId).toBe(s1.versions[0].id);
    expect(s2.notice).toBeNull();
    expect(s2.error).toBeNull();
  });

  it("START while pending is a no-op", () => {
    const s = sessionReducer(initialSessionState, { type: "START", id: 1, instruction: "a" });
    expect(sessionReducer(s, { type: "START", id: 2, instruction: "b" })).toBe(s);
  });

  it("CHUNK sets full text; stale or no pending no-op", () => {
    const s = sessionReducer(initialSessionState, { type: "START", id: 1, instruction: "a" });
    const c = sessionReducer(s, { type: "CHUNK", id: 1, text: "abc" });
    expect(c.pending?.text).toBe("abc");
    expect(sessionReducer(c, { type: "CHUNK", id: 9, text: "z" })).toBe(c);
    expect(sessionReducer(initialSessionState, { type: "CHUNK", id: 1, text: "z" })).toBe(
      initialSessionState,
    );
  });

  it("COMMIT valid appends version", () => {
    const s = commit(initialSessionState, 1, "```tsx\n" + code(1) + "\n```");
    expect(s.versions).toHaveLength(1);
    expect(s.versions[0]).toMatchObject({ id: 1, source: "ai", instruction: "x" });
    expect(s.cursor).toBe(0);
    expect(s.pending).toBeNull();
    expect(s.notice).toBe("committed");
    expect(s.nextVersionId).toBe(2);
    expect(committedVersion(s)?.code).toBe(code(1));
  });

  it("COMMIT with empty code or no export default is invalid and keeps versions", () => {
    const base = commit(initialSessionState, 1, code(1));
    for (const raw of ["   ", "const a = 1;"]) {
      const s = commit(base, 2, raw, "refine");
      expect(s.versions).toEqual(base.versions);
      expect(s.cursor).toBe(base.cursor);
      expect(s.pending).toBeNull();
      expect(s.error).toEqual({
        kind: "invalid",
        instruction: "refine",
        baseId: base.versions[0].id,
      });
    }
  });

  it("COMMIT with stale id is a no-op", () => {
    const s = sessionReducer(initialSessionState, { type: "START", id: 1, instruction: "a" });
    expect(sessionReducer(s, { type: "COMMIT", id: 2, raw: code(1) })).toBe(s);
  });

  it("FAIL keeps versions, records error with pending data; stale no-op", () => {
    const base = commit(initialSessionState, 1, code(1));
    const p = sessionReducer(base, { type: "START", id: 2, instruction: "r" });
    expect(sessionReducer(p, { type: "FAIL", id: 5, kind: "failed" })).toBe(p);
    const f = sessionReducer(p, { type: "FAIL", id: 2, kind: "rate_limit" });
    expect(f.versions).toBe(base.versions);
    expect(f.cursor).toBe(base.cursor);
    expect(f.pending).toBeNull();
    expect(f.error).toEqual({ kind: "rate_limit", instruction: "r", baseId: base.versions[0].id });
    expect(f.notice).toBeNull();
  });

  it("retry after FAIL reuses same baseId", () => {
    const base = commit(commit(initialSessionState, 1, code(1)), 2, code(2));
    const undone = sessionReducer(base, { type: "UNDO" });
    const failed = run(
      [
        { type: "START", id: 3, instruction: "r" },
        { type: "FAIL", id: 3, kind: "failed" },
        { type: "START", id: 4, instruction: "r" },
      ],
      undone,
    );
    expect(failed.pending?.baseId).toBe(undone.versions[0].id);
    expect(failed.versions).toHaveLength(2);
  });

  it("START with explicit baseId targets it; null base replaces from scratch", () => {
    const base = commit(commit(initialSessionState, 1, code(1)), 2, code(2));
    const fromParent = run(
      [
        { type: "START", id: 3, instruction: "again", baseId: base.versions[0].id },
        { type: "COMMIT", id: 3, raw: code(3) },
      ],
      base,
    );
    expect(fromParent.versions.map((v) => v.code)).toEqual([code(1), code(3)]);
    expect(fromParent.cursor).toBe(1);

    const fresh = run(
      [
        { type: "START", id: 4, instruction: "first", baseId: null },
        { type: "COMMIT", id: 4, raw: code(4) },
      ],
      commit(initialSessionState, 1, code(1)),
    );
    expect(fresh.versions.map((v) => v.code)).toEqual([code(4)]);
  });

  it("ABORT clears pending without error; stale chunk/commit after abort are no-ops", () => {
    const s = run([
      { type: "START", id: 1, instruction: "a" },
      { type: "ABORT", id: 1 },
      { type: "CHUNK", id: 1, text: "late" },
      { type: "COMMIT", id: 1, raw: code(1) },
    ]);
    expect(s.versions).toEqual([]);
    expect(s.pending).toBeNull();
    expect(s.error).toBeNull();
    expect(s.cursor).toBe(-1);
  });

  it("REJECT sets too_large error without pending; ignored when pending", () => {
    const base = commit(initialSessionState, 1, code(1));
    const r = sessionReducer(base, { type: "REJECT", kind: "too_large", instruction: "big" });
    expect(r.pending).toBeNull();
    expect(r.error).toEqual({ kind: "too_large", instruction: "big", baseId: base.versions[0].id });
    expect(r.versions).toBe(base.versions);
    const p = sessionReducer(base, { type: "START", id: 2, instruction: "a" });
    expect(sessionReducer(p, { type: "REJECT", kind: "too_large", instruction: "big" })).toBe(p);
  });

  it("UNDO moves cursor back, keeps later versions; blocked at v1 or pending", () => {
    let s = initialSessionState;
    for (let i = 1; i <= 3; i++) s = commit(s, i, code(i));
    expect(canUndo(s)).toBe(true);
    const u = sessionReducer(s, { type: "UNDO" });
    expect(u.cursor).toBe(1);
    expect(u.versions).toHaveLength(3);
    expect(u.notice).toBe("undo");
    const u0 = sessionReducer(u, { type: "UNDO" });
    expect(u0.cursor).toBe(0);
    expect(canUndo(u0)).toBe(false);
    expect(sessionReducer(u0, { type: "UNDO" })).toBe(u0);
    const p = sessionReducer(s, { type: "START", id: 9, instruction: "a" });
    expect(canUndo(p)).toBe(false);
    expect(sessionReducer(p, { type: "UNDO" })).toBe(p);
  });

  it("refining from an older cursor truncates later versions at COMMIT", () => {
    let s = initialSessionState;
    for (let i = 1; i <= 3; i++) s = commit(s, i, code(i));
    s = run([{ type: "UNDO" }, { type: "UNDO" }], s);
    s = commit(s, 4, code(4), "new");
    expect(s.versions).toHaveLength(2);
    expect(s.cursor).toBe(1);
    expect(s.versions[0].id).toBe(1);
    expect(s.versions[1].instruction).toBe("new");
    expect(s.versions[1].id).toBe(4);
  });

  it("START does not truncate history", () => {
    let s = initialSessionState;
    for (let i = 1; i <= 3; i++) s = commit(s, i, code(i));
    s = run([{ type: "UNDO" }, { type: "START", id: 4, instruction: "x" }], s);
    expect(s.versions).toHaveLength(3);
  });

  it("caps at MAX_VERSIONS dropping oldest with monotonic ids", () => {
    let s = initialSessionState;
    for (let i = 1; i <= MAX_VERSIONS + 1; i++) {
      s = commit(s, i, code(i));
      expect(s.versions.length).toBeLessThanOrEqual(MAX_VERSIONS);
    }
    expect(s.versions).toHaveLength(MAX_VERSIONS);
    expect(s.cursor).toBe(MAX_VERSIONS - 1);
    expect(s.versions[0].id).toBe(2);
    expect(s.versions[MAX_VERSIONS - 1].id).toBe(MAX_VERSIONS + 1);
  });

  it("RESET clears everything but keeps nextVersionId", () => {
    let s = commit(commit(initialSessionState, 1, code(1)), 2, code(2));
    s = sessionReducer(s, { type: "RESET" });
    expect(s.versions).toEqual([]);
    expect(s.cursor).toBe(-1);
    expect(s.pending).toBeNull();
    expect(s.error).toBeNull();
    expect(s.notice).toBe("reset");
    expect(s.nextVersionId).toBe(3);
    expect(committedVersion(s)).toBeNull();
  });
});
