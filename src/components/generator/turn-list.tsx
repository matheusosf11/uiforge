"use client";

import { useLayoutEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransientTurnItem, TurnItem } from "@/components/generator/turn-item";
import { MAX_VERSIONS, displayNumber } from "@/lib/session";
import type { Version } from "@/lib/session";
import { cn } from "@/lib/utils";

export type TurnTransient = {
  kind: "gerando" | "erro";
  instruction: string;
} | null;

const REGION_ID = "turn-list-region";

/**
 * Scrolls only `container` so `el` is fully visible (block "nearest").
 * Never use scrollIntoView: it also scrolls the page.
 */
export function scrollIntoContainer(container: HTMLElement, el: HTMLElement): void {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  if (e.top < c.top) {
    container.scrollTop -= c.top - e.top;
  } else if (e.bottom > c.bottom) {
    container.scrollTop += e.bottom - c.bottom;
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
