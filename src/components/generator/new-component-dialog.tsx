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

type NewComponentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  /** Focus target on cancel / Esc (the "Novo componente" button). */
  finalFocusRef?: React.RefObject<HTMLElement | null>
  /** Focus target after confirming (the prompt textarea, UI-SPEC section 3). */
  confirmFocusRef?: React.RefObject<HTMLElement | null>
}

export function NewComponentDialog({
  open,
  onOpenChange,
  onConfirm,
  finalFocusRef,
  confirmFocusRef,
}: NewComponentDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  // Set on confirm so the close-time focus target depends on how the dialog
  // closed. Focusing imperatively inside onConfirm loses to the focus trap,
  // and the "Novo componente" button is unmounted by the reset.
  const confirmedRef = React.useRef(false)

  const handleOpenChange = (next: boolean) => {
    if (next) confirmedRef.current = false
    onOpenChange(next)
  }

  const finalFocus = () => {
    if (confirmedRef.current) {
      confirmedRef.current = false
      return confirmFocusRef?.current ?? true
    }
    return finalFocusRef?.current ?? true
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent initialFocus={cancelRef} finalFocus={finalFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Começar um novo componente?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso descarta todas as versões desta sessão. O texto do campo de
            prompt será mantido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              confirmedRef.current = true
              onConfirm()
            }}
          >
            Descartar e começar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
