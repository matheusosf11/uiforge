"use client"

import { useEffect } from "react"

const TEXT_FIELD_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])"

type Options = {
  enabled: boolean
  dialogOpen: boolean
  onUndo: () => void
}

export function useUndoShortcut({ enabled, dialogOpen, onUndo }: Options) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!enabled || dialogOpen) return
      if (e.defaultPrevented || e.repeat) return
      if (e.shiftKey || e.altKey) return
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key.toLowerCase() !== "z" && e.code !== "KeyZ") return
      const target = e.target
      if (target instanceof Element && target.closest(TEXT_FIELD_SELECTOR)) {
        return
      }
      if (document.querySelector('[role="alertdialog"]')) return
      e.preventDefault()
      onUndo()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [enabled, dialogOpen, onUndo])
}
