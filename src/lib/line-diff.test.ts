/// <reference types="vitest/globals" />
import { diffHunks, diffLines, diffStats } from "./line-diff";

describe("diffLines", () => {
  it("marks added, removed and unchanged lines with line numbers", () => {
    const out = diffLines("a\nb\nc", "a\nB\nc\nd");
    expect(out).toEqual([
      { type: "same", text: "a", oldNo: 1, newNo: 1 },
      { type: "del", text: "b", oldNo: 2 },
      { type: "add", text: "B", newNo: 2 },
      { type: "same", text: "c", oldNo: 3, newNo: 3 },
      { type: "add", text: "d", newNo: 4 },
    ]);
    expect(diffStats(out)).toEqual({ added: 2, removed: 1 });
  });

  it("handles empty sides and CRLF", () => {
    expect(diffStats(diffLines("", "x\ny"))).toEqual({ added: 2, removed: 0 });
    expect(diffStats(diffLines("x", ""))).toEqual({ added: 0, removed: 1 });
    expect(diffStats(diffLines("a\r\nb", "a\nb"))).toEqual({ added: 0, removed: 0 });
  });

  it("keeps the common suffix numbered on both sides", () => {
    const out = diffLines("x\nend", "x\nnew\nend");
    expect(out.at(-1)).toEqual({ type: "same", text: "end", oldNo: 2, newNo: 3 });
  });
});

describe("diffHunks", () => {
  it("collapses long unchanged runs around the changes", () => {
    const before = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
    const after = before.replace("l10", "L10");
    const hunks = diffHunks(diffLines(before, after), 2);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].hiddenBefore).toBe(8);
    expect(hunks[0].lines.map((l) => l.text)).toEqual(["l8", "l9", "l10", "L10", "l11", "l12"]);
  });
});
