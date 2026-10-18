"use client";

import { useState, type ReactNode } from "react";
import { GripHorizontal, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DraggableWidgetGrid,
  type WidgetItem,
} from "@/components/ui/draggable-widget-grid";

export type PanelId = "prompt" | "preview" | "code";

export const DEFAULT_PANELS: WidgetItem[] = [
  { id: "prompt", size: "sm", label: "Card Prompt" },
  { id: "preview", size: "sm", label: "Card Preview" },
  { id: "code", size: "wide", label: "Card Código" },
];

export const PANEL_ORDER_KEY = "uiforge.panel-order";
// Tall enough for the prompt card with the version history open.
const ROW_HEIGHT = 560;
const HANDLE = "[data-drag-handle]";

/** Saved order from a previous visit, or null when missing or invalid. */
export function readPanelOrder(): WidgetItem[] | null {
  try {
    const raw = window.localStorage.getItem(PANEL_ORDER_KEY);
    if (!raw) return null;
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids) || ids.length !== DEFAULT_PANELS.length) return null;
    const byId = new Map(DEFAULT_PANELS.map((p) => [p.id, p]));
    const items = ids.map((id) => (typeof id === "string" ? byId.get(id) : undefined));
    if (items.some((p) => !p) || new Set(ids).size !== ids.length) return null;
    return items as WidgetItem[];
  } catch {
    return null;
  }
}

function savePanelOrder(items: WidgetItem[] | null) {
  try {
    if (items) {
      window.localStorage.setItem(
        PANEL_ORDER_KEY,
        JSON.stringify(items.map((p) => p.id)),
      );
    } else {
      window.localStorage.removeItem(PANEL_ORDER_KEY);
    }
  } catch {
    // Storage blocked: the order just isn't remembered.
  }
}

const isDefault = (items: WidgetItem[]) =>
  items.every((p, i) => p.id === DEFAULT_PANELS[i].id);

/**
 * Desktop layout of the generator: the Prompt, Preview and Código cards can be
 * dragged by their grip (or moved with Alt + arrows on the focused card) and
 * the order is remembered in this browser.
 */
export function PanelBoard({
  panels,
  toolbar,
}: {
  panels: Record<PanelId, ReactNode>;
  /** Rendered left of the "Restaurar layout" button (status, errors). */
  toolbar?: ReactNode;
}) {
  const [initial] = useState(() => readPanelOrder() ?? DEFAULT_PANELS);
  const [custom, setCustom] = useState(() => !isDefault(initial));
  // Bumped to remount the grid with the default order.
  const [gridKey, setGridKey] = useState(0);

  function handleChange(items: WidgetItem[]) {
    const changed = !isDefault(items);
    setCustom(changed);
    savePanelOrder(changed ? items : null);
  }

  function handleReset() {
    savePanelOrder(null);
    setCustom(false);
    setGridKey((k) => k + 1);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">{toolbar}</div>
        {custom ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs text-muted-foreground"
            onClick={handleReset}
          >
            <LayoutGrid /> Restaurar layout
          </Button>
        ) : null}
      </div>
      <DraggableWidgetGrid
        key={gridKey}
        items={gridKey === 0 ? initial : DEFAULT_PANELS}
        onChange={handleChange}
        maxColumns={2}
        cellSize={360}
        rowHeight={ROW_HEIGHT}
        gap={16}
        radius={12}
        dragHandle={HANDLE}
        surfaceClassName=""
        hint="Arraste um card pela alça no topo para trocar de lugar. Pelo teclado, foque o card, segure Alt e use as setas."
        renderItem={(item) => (
          <div
            className={
              item.id === "prompt"
                ? // The prompt card grows with the history; the cell scrolls.
                  "relative h-full min-h-0 overflow-auto [&>section]:h-auto [&>section]:min-h-full"
                : "relative h-full min-h-0 overflow-hidden [&>section]:h-full"
            }
          >
            <div
              data-drag-handle
              aria-hidden="true"
              title="Arraste para mover o card"
              className="absolute top-1 left-1/2 z-10 flex h-3.5 w-12 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
            >
              <GripHorizontal className="size-4" />
            </div>
            {panels[item.id as PanelId]}
          </div>
        )}
      />
    </div>
  );
}
