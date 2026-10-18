"use client";

import { useLayoutEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransientTurnItem, TurnItem } from "@/components/generator/turn-item";
import { MAX_VERSIONS, displayNumber } from "@/lib/session";
import type { Version } from "@/lib/session";
import { cn } from "@/lib/utils";

export type TurnTransient = {
  kind: "gerando" | "erro" | "rascunho";
  instruction: string;
} | null;

const REGION_ID = "turn-list-region";

/** Width of the items' `focus-visible:ring-3` ring, in px. */
const FOCUS_RING_PX = 3;

/**
 * Scrolls only `container` so `el` is fully visible (block "nearest").
 * Never use scrollIntoView: it also scrolls the page.
 *
 * WR-03: measures against the scrollport (the padding box, inside the
 * border) and keeps the container's padding, at least the focus ring's
 * width, between `el` and the edge so the ring is never clipped.
 */
export function scrollIntoContainer(
  container: HTMLElement,
  el: HTMLElement,
  ringWidth = FOCUS_RING_PX,
): void {
  // Not laid out (e.g. the collapsed mobile disclosure): nothing to align.
  if (container.clientHeight === 0) return;
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  const style = window.getComputedStyle(container);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const innerTop = c.top + container.clientTop;
  const top = innerTop + Math.max(padTop, ringWidth);
  const bottom =
    innerTop + container.clientHeight - Math.max(padBottom, ringWidth);
  if (e.top < top) {
    container.scrollTop -= top - e.top;
  } else if (e.bottom > bottom) {
    container.scrollTop += e.bottom - bottom;
  }
}

type TurnListProps = {
  versions: Version[];
  cursor: number;
  droppedCount: number;
  busy: boolean;
  transient: TurnTransient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (versionId: number) => void;
  /** A draft exists: the current item becomes clickable (D-07). */
  draftActive?: boolean;
};

export function TurnList({
  versions,
  cursor,
  droppedCount,
  busy,
  transient,
  open,
  onOpenChange,
  onRestore,
  draftActive = false,
}: TurnListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLButtonElement | null>(null);
  const transientRef = useRef<HTMLLIElement | null>(null);
  const currentId = versions[cursor]?.id;
  const transientKind = transient?.kind;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const target = transientRef.current ?? currentRef.current;
    if (container && target) scrollIntoContainer(container, target);
  }, [cursor, currentId, versions.length, transientKind, open]);

  return (
    <div className="mb-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-between max-md:min-h-11 md:hidden"
        aria-expanded={open}
        aria-controls={REGION_ID}
        onClick={() => onOpenChange(!open)}
      >
        Histórico ({versions.length})
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </Button>
      <div
        id={REGION_ID}
        ref={containerRef}
        className={cn(
          "max-h-44 overflow-y-auto overscroll-contain rounded-lg border border-border p-1 max-md:max-h-60",
          open ? "max-md:mt-1" : "max-md:hidden",
        )}
      >
        {droppedCount > 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Versões mais antigas descartadas (limite de {MAX_VERSIONS})
          </p>
        ) : null}
        <ol
          // WR-02: list-style none drops the implicit list role in WebKit.
          role="list"
          aria-label="Histórico de versões"
          className="flex flex-col gap-1"
        >
          {versions.map((v, index) => {
            const position =
              index < cursor ? "before" : index === cursor ? "current" : "later";
            return (
              <li key={v.id}>
                <TurnItem
                  number={displayNumber(droppedCount, index)}
                  text={v.source === "manual" ? "Edição manual" : v.instruction}
                  position={position}
                  busy={busy}
                  onRestore={() => onRestore(v.id)}
                  itemRef={position === "current" ? currentRef : undefined}
                  allowCurrentClick={draftActive && position === "current"}
                />
              </li>
            );
          })}
          {transient ? (
            <li key="transient" ref={transientRef}>
              <TransientTurnItem
                kind={transient.kind}
                instruction={transient.instruction}
              />
            </li>
          ) : null}
        </ol>
      </div>
    </div>
  );
}
