"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type DiscardDraftDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  /** Display number of the draft's base version. */
  baseNumber: number
  /** Display number of the version the user asked to go to. */
  targetNumber: number
  /**
   * Focus target on close, either way (the clicked turn item: items are keyed
   * by id and survive the restore).
   */
  finalFocusRef?: React.RefObject<HTMLElement | null>
}

export function DiscardDraftDialog({
  open,
  onOpenChange,
  onConfirm,
  baseNumber,
  targetNumber,
  finalFocusRef,
}: DiscardDraftDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        initialFocus={cancelRef}
        finalFocus={() => finalFocusRef?.current ?? true}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar edições?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Você tem edições na v${baseNumber}. Ir para a v${targetNumber} descarta essas edições.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Descartar edições e ir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
