"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { FolderOpen, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { SavedProject } from "@/lib/project-store";
import { cn } from "@/lib/utils";

type ProjectsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: readonly SavedProject[];
  currentId: string | null;
  /** False while a request runs: opening would replace the session. */
  canOpen: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  finalFocusRef?: React.RefObject<HTMLElement | null>;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ProjectsDialog({
  open,
  onOpenChange,
  projects,
  currentId,
  canOpen,
  onOpen,
  onDelete,
  finalFocusRef,
}: ProjectsDialogProps) {
  // Deleting cannot be undone, so the trash button asks once inline.
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) setConfirmId(null);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs" />
        <Dialog.Popup
          finalFocus={finalFocusRef}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="grid gap-1">
              <Dialog.Title className="text-base font-medium">
                Projetos salvos
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Salvos só neste navegador, com todas as versões. Sem conta e
                sem enviar nada para o servidor.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "max-md:size-11")}
            >
              <X />
            </Dialog.Close>
          </div>
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum projeto salvo ainda. Gere um componente e ele aparece aqui.
            </p>
          ) : (
            <ul aria-label="Projetos" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {projects.map((p) => {
                const current = p.id === currentId;
                const n = p.versions.length;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 border-b border-border py-2 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={p.title}>
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {current ? "Aberto agora · " : ""}
                        {n} {n === 1 ? "versão" : "versões"} ·{" "}
                        {dateFormat.format(p.updatedAt)}
                      </p>
                    </div>
                    {confirmId === p.id ? (
                      <>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="text-xs max-md:min-h-11"
                          onClick={() => {
                            setConfirmId(null);
                            onDelete(p.id);
                          }}
                        >
                          Excluir
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs max-md:min-h-11"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs max-md:min-h-11"
                          disabled={current || !canOpen}
                          aria-label={`Abrir ${p.title}`}
                          onClick={() => onOpen(p.id)}
                        >
                          <FolderOpen aria-hidden />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 max-md:size-11"
                          aria-label={`Excluir ${p.title}`}
                          disabled={current && !canOpen}
                          onClick={() => setConfirmId(p.id)}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
