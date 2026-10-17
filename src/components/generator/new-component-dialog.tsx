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
  finalFocusRef?: React.RefObject<HTMLElement | null>
}

export function NewComponentDialog({
  open,
  onOpenChange,
  onConfirm,
  finalFocusRef,
}: NewComponentDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        initialFocus={cancelRef}
        finalFocus={finalFocusRef}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Começar um novo componente?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso descarta todas as versões desta sessão. O texto do campo de
            prompt será mantido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Descartar e começar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
