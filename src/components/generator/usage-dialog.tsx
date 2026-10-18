"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Copy, PackageOpen, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { componentFilename } from "@/lib/download-filename";
import { usageReadme, usageSteps, type UsageStep } from "@/lib/usage-guide";
import { createZip } from "@/lib/zip";
import { cn } from "@/lib/utils";

type UsageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  finalFocusRef?: React.RefObject<HTMLElement | null>;
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** ComponentName.zip with ComponentName.tsx and README.md. */
export function downloadPackage(code: string) {
  const file = componentFilename(code);
  const zip = createZip([
    { name: file, content: code.endsWith("\n") ? code : `${code}\n` },
    { name: "README.md", content: usageReadme(code) },
  ]);
  saveBlob(new Blob([zip], { type: "application/zip" }), file.replace(/\.tsx$/, ".zip"));
}

function CodeSnippet({ step }: { step: UsageStep }) {
  const [copied, setCopied] = React.useState(false);
  if (!step.code) return null;
  return (
    <div className="relative mt-2">
      <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 pr-10 font-mono text-xs">
        {step.code}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 size-7 max-md:size-11"
        aria-label={copied ? "Copiado" : `Copiar: ${step.title}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(step.code ?? "");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked: the text stays selectable in the block.
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

export function UsageDialog({ open, onOpenChange, code, finalFocusRef }: UsageDialogProps) {
  const steps = React.useMemo(() => usageSteps(code), [code]);
  const file = componentFilename(code);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs" />
        <Dialog.Popup
          finalFocus={finalFocusRef}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="grid gap-1">
              <Dialog.Title className="text-base font-medium">
                Usar {file} em outro projeto
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                O pacote .zip traz o componente e um README com estes passos.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "max-md:size-11")}
            >
              <X />
            </Dialog.Close>
          </div>
          <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {steps.map((step, i) => (
              <li key={step.title}>
                <h3 className="text-sm font-medium">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                <CodeSnippet step={step} />
              </li>
            ))}
          </ol>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => downloadPackage(code)}>
              <PackageOpen aria-hidden />
              Baixar pacote (.zip)
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
