"use client";

import { useId, useMemo, useState } from "react";
import { diffHunks, diffLines, diffStats, type DiffLine } from "@/lib/line-diff";
import { displayNumber, type Version } from "@/lib/session";
import { cn } from "@/lib/utils";

type VersionDiffProps = {
  versions: readonly Version[];
  droppedCount: number;
  /** Index of the committed version: the default "Para" side. */
  cursor: number;
};

const ROW: Record<DiffLine["type"], string> = {
  same: "text-muted-foreground",
  add: "bg-emerald-500/15 text-foreground",
  del: "bg-rose-500/15 text-foreground",
};
const SIGN: Record<DiffLine["type"], string> = { same: " ", add: "+", del: "−" };
const SR: Record<DiffLine["type"], string> = {
  same: "",
  add: "Adicionada: ",
  del: "Removida: ",
};

function Row({ line }: { line: DiffLine }) {
  return (
    <li className={cn("flex min-w-max", ROW[line.type])}>
      <span aria-hidden className="w-10 shrink-0 select-none pr-2 text-right opacity-60">
        {line.type === "add" ? "" : line.oldNo}
      </span>
      <span aria-hidden className="w-10 shrink-0 select-none pr-2 text-right opacity-60">
        {line.type === "del" ? "" : line.newNo}
      </span>
      <span aria-hidden className="w-4 shrink-0 select-none">
        {SIGN[line.type]}
      </span>
      <span className="whitespace-pre pr-3">
        {SR[line.type] ? <span className="sr-only">{SR[line.type]}</span> : null}
        {line.text || " "}
      </span>
    </li>
  );
}

export function VersionDiff({ versions, droppedCount, cursor }: VersionDiffProps) {
  const fromId = useId();
  const toId = useId();
  const [toIndex, setToIndex] = useState(cursor);
  const [fromIndex, setFromIndex] = useState(Math.max(0, cursor - 1));
  const [showAll, setShowAll] = useState(false);

  // Indices may go stale if the list shrinks; clamp instead of crashing.
  const last = versions.length - 1;
  const from = versions[Math.min(fromIndex, last)];
  const to = versions[Math.min(toIndex, last)];

  const lines = useMemo(
    () => (from && to ? diffLines(from.code, to.code) : []),
    [from, to],
  );
  const stats = diffStats(lines);
  const hunks = useMemo(() => diffHunks(lines), [lines]);
  const label = (i: number) => {
    const v = versions[i];
    const n = displayNumber(droppedCount, i);
    return v.source === "manual" ? `v${n} (edição)` : `v${n}`;
  };

  const select = "h-8 rounded-md border border-border bg-background px-2 text-xs max-md:min-h-11";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label htmlFor={fromId} className="text-muted-foreground">
          De
        </label>
        <select
          id={fromId}
          className={select}
          value={Math.min(fromIndex, last)}
          onChange={(e) => setFromIndex(Number(e.target.value))}
        >
          {versions.map((v, i) => (
            <option key={v.id} value={i}>
              {label(i)}
            </option>
          ))}
        </select>
        <label htmlFor={toId} className="text-muted-foreground">
          para
        </label>
        <select
          id={toId}
          className={select}
          value={Math.min(toIndex, last)}
          onChange={(e) => setToIndex(Number(e.target.value))}
        >
          {versions.map((v, i) => (
            <option key={v.id} value={i}>
              {label(i)}
            </option>
          ))}
        </select>
        <p aria-live="polite" className="tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400">+{stats.added}</span>{" "}
          <span className="text-rose-600 dark:text-rose-400">−{stats.removed}</span>{" "}
          <span className="sr-only">
            {stats.added} linhas adicionadas e {stats.removed} removidas
          </span>
        </p>
        <label className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground max-md:min-h-11">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Mostrar arquivo inteiro
        </label>
      </div>
      <div
        className="max-h-[70vh] flex-1 overflow-auto rounded-lg border border-border bg-background py-2 font-mono text-xs leading-relaxed"
        tabIndex={0}
        role="region"
        aria-label={`Diferenças entre ${from ? label(Math.min(fromIndex, last)) : ""} e ${to ? label(Math.min(toIndex, last)) : ""}`}
      >
        {stats.added === 0 && stats.removed === 0 ? (
          <p className="px-3 font-sans text-muted-foreground">
            As duas versões têm o mesmo código.
          </p>
        ) : showAll ? (
          <ol>
            {lines.map((l, i) => (
              <Row key={i} line={l} />
            ))}
          </ol>
        ) : (
          hunks.map((h, hi) => (
            <div key={hi}>
              {h.hiddenBefore > 0 ? (
                <p className="px-3 py-1 font-sans text-[11px] text-muted-foreground">
                  ⋯ {h.hiddenBefore} {h.hiddenBefore === 1 ? "linha igual" : "linhas iguais"}
                </p>
              ) : null}
              <ol>
                {h.lines.map((l, i) => (
                  <Row key={i} line={l} />
                ))}
              </ol>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
