"use client"

import * as React from "react"
import { FilePlus2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type SessionBarProps = {
  number: number
  total: number
  canUndo: boolean
  busy: boolean
  onUndo: () => void
  onNew: () => void
  newButtonRef?: React.Ref<HTMLButtonElement>
}

export function SessionBar({
  number,
  total,
  canUndo,
  busy,
  onUndo,
  onNew,
  newButtonRef,
}: SessionBarProps) {
  const undoDisabled = !canUndo || busy
  return (
    <div
      role="toolbar"
      aria-label="Sessão"
      className="mb-2 flex flex-wrap items-center justify-between gap-2"
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        v{number} · {total} {total === 1 ? "versão" : "versões"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-md:min-h-11"
          disabled={undoDisabled}
          onClick={onUndo}
          aria-keyshortcuts="Control+Z Meta+Z"
          title={undoDisabled ? undefined : "Desfazer (Ctrl/⌘+Z)"}
        >
          <Undo2 aria-hidden="true" />
          Desfazer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-md:min-h-11"
          disabled={busy}
          onClick={onNew}
          ref={newButtonRef}
        >
          <FilePlus2 aria-hidden="true" />
          Novo componente
        </Button>
      </div>
    </div>
  )
}
