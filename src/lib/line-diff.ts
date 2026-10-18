// Line diff between two versions of a component (longest common subsequence).
// Code is capped at 30,000 characters, so the O(n·m) table stays small enough
// for the browser; beyond MAX_CELLS it falls back to "all removed, all added".

export type DiffLine =
  | { type: "same"; text: string; oldNo: number; newNo: number }
  | { type: "del"; text: string; oldNo: number }
  | { type: "add"; text: string; newNo: number };

const MAX_CELLS = 4_000_000;

function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n?/g, "\n").split("\n");
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);

  // Common prefix and suffix are cheap and shrink the table a lot for the
  // typical refine, which changes a few lines in the middle.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const out: DiffLine[] = [];
  for (let i = 0; i < start; i++) {
    out.push({ type: "same", text: a[i], oldNo: i + 1, newNo: i + 1 });
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  if (n * m > MAX_CELLS) {
    midA.forEach((text, i) => out.push({ type: "del", text, oldNo: start + i + 1 }));
    midB.forEach((text, j) => out.push({ type: "add", text, newNo: start + j + 1 }));
  } else {
    // lcs[i][j] = LCS length of midA[i..] and midB[j..], in one flat array.
    const w = m + 1;
    const lcs = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * w + j] =
          midA[i] === midB[j]
            ? lcs[(i + 1) * w + j + 1] + 1
            : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        out.push({ type: "same", text: midA[i], oldNo: start + i + 1, newNo: start + j + 1 });
        i++;
        j++;
      } else if (i < n && (j === m || lcs[(i + 1) * w + j] >= lcs[i * w + j + 1])) {
        // Removals first on a tie, like `git diff`.
        out.push({ type: "del", text: midA[i], oldNo: start + i + 1 });
        i++;
      } else {
        out.push({ type: "add", text: midB[j], newNo: start + j + 1 });
        j++;
      }
    }
  }

  const shift = b.length - a.length;
  for (let i = endA; i < a.length; i++) {
    out.push({ type: "same", text: a[i], oldNo: i + 1, newNo: i + 1 + shift });
  }
  return out;
}

export function diffStats(lines: readonly DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === "add") added++;
    else if (l.type === "del") removed++;
  }
  return { added, removed };
}

export type DiffHunk = { lines: DiffLine[]; hiddenBefore: number };

/**
 * Groups changes with `context` unchanged lines around them; the unchanged
 * runs in between are collapsed and counted in hiddenBefore.
 */
export function diffHunks(lines: readonly DiffLine[], context = 3): DiffHunk[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.type === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) {
      keep[k] = true;
    }
  });
  const hunks: DiffHunk[] = [];
  let hidden = 0;
  let current: DiffHunk | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (!keep[i]) {
      hidden++;
      current = null;
      continue;
    }
    if (!current) {
      current = { lines: [], hiddenBefore: hidden };
      hunks.push(current);
      hidden = 0;
    }
    current.lines.push(lines[i]);
  }
  return hunks;
}
