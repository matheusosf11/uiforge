"use client";

import type { Ref } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TurnItemProps = {
  number: number;
  text: string;
  position: "before" | "current" | "later";
  busy: boolean;
  onRestore: () => void;
  itemRef?: Ref<HTMLButtonElement>;
};

const ROW =
  "flex h-8 w-full min-w-0 items-center gap-2 rounded-md border-l-2 border-transparent px-2 text-left text-xs max-md:min-h-11";

const LATER_DIM =
  "opacity-50 group-hover:opacity-100 group-focus-visible:opacity-100";

function turnLabel(
  number: number,
  text: string,
  position: TurnItemProps["position"],
): string {
  if (position === "current") return `v${number}, versão atual: ${text}. Concluída.`;
  if (position === "later")
    return `Restaurar v${number}: ${text}. Concluída. Será descartada ao refinar.`;
  return `Restaurar v${number}: ${text}. Concluída.`;
}

export function TurnItem({
  number,
  text,
  position,
  busy,
  onRestore,
  itemRef,
}: TurnItemProps) {
  const current = position === "current";
  const later = position === "later";
  return (
    <button
      ref={itemRef}
      type="button"
      aria-current={current ? "true" : undefined}
      aria-label={turnLabel(number, text, position)}
      title={text}
      // Only busy disables: a disabled focused button would drop focus (D-19).
      disabled={busy}
      onClick={() => {
        if (!current) onRestore();
      }}
      className={cn(
        "group",
        ROW,
        "outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-default",
        current && "border-primary bg-muted",
      )}
    >
      <span className="min-w-7 shrink-0 font-medium text-foreground tabular-nums">
        v{number}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          current ? "text-foreground" : "text-muted-foreground",
          later && LATER_DIM,
        )}
      >
        {text}
      </span>
      {current ? (
        <span className="inline-flex h-4 shrink-0 items-center rounded-sm bg-background px-1 text-xs leading-4 font-medium text-foreground">
          atual
        </span>
      ) : null}
      <Check
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-muted-foreground",
          later && LATER_DIM,
        )}
      />
    </button>
  );
}

type TransientTurnItemProps = {
  kind: "gerando" | "erro";
  instruction: string;
};

export function TransientTurnItem({ kind, instruction }: TransientTurnItemProps) {
  const erro = kind === "erro";
  return (
    <div className={ROW}>
      <span className="min-w-7 shrink-0" />
      <span
        className="min-w-0 flex-1 truncate text-muted-foreground"
        title={instruction}
      >
        <span className="sr-only">{erro ? "Erro: " : "Gerando: "}</span>
        {instruction}
      </span>
      {erro ? (
        <>
          <span aria-hidden="true" className="shrink-0 text-xs text-destructive">
            erro
          </span>
          <AlertTriangle
            aria-hidden="true"
            className="size-4 shrink-0 text-destructive"
          />
        </>
      ) : (
        <>
          <span
            aria-hidden="true"
            className="shrink-0 text-xs text-muted-foreground"
          >
            gerando…
          </span>
          <Loader2
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
          />
        </>
      )}
    </div>
  );
}
