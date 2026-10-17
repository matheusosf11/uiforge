"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreviewSrcdoc } from "@/lib/preview-srcdoc";
import { hasDefaultExport } from "@/lib/has-default-export";

export const PREVIEW_LOAD_TIMEOUT_MS = 15000;

export function SandboxPreview({
  code,
  onRegenerate,
  regenerateDisabled = false,
  updating = false,
  regenerateLabel = "Gerar de novo",
}: {
  code: string;
  /** Offered when the generated code fails to compile/run in the preview. */
  onRegenerate?: () => void;
  regenerateDisabled?: boolean;
  /** Shows a non-live "Atualizando…" badge while a refinement streams. */
  updating?: boolean;
  /** Label of the runtime-error retry button. */
  regenerateLabel?: string;
}) {
  const srcDoc = useMemo(() => buildPreviewSrcdoc(code), [code]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  // Bumped by "Recarregar preview" to remount the iframe and refetch the runtime.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setRuntimeError(null);
    setTimedOut(false);
    // A runtime script that never finishes loading (blocked or stalled network)
    // leaves the iframe blank without any error event, so watch for silence.
    const timer = window.setTimeout(
      () => setTimedOut(true),
      PREVIEW_LOAD_TIMEOUT_MS,
    );
    function onMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "uiforge-preview-error") {
        window.clearTimeout(timer);
        setTimedOut(false);
        setRuntimeError(String(event.data.message || "Erro no preview"));
      }
      if (event.data.type === "uiforge-preview-ready") {
        window.clearTimeout(timer);
        setTimedOut(false);
        setRuntimeError(null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [code, reloadKey]);

  const missingDefault = !hasDefaultExport(code);

  return (
    <section
      aria-label="Live preview"
      className="flex min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Preview</h2>
        {updating ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            <Loader2
              aria-hidden="true"
              className="size-3 animate-spin motion-reduce:animate-none"
            />
            Atualizando…
          </span>
        ) : null}
      </div>
      {missingDefault ? (
        <p
          role="alert"
          className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          O código gerado não exporta um componente padrão.
        </p>
      ) : null}
      {runtimeError ? (
        <div
          role="alert"
          className="mb-2 flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>A IA gerou um código com erro e o preview não conseguiu rodar.</p>
            {onRegenerate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={onRegenerate}
                disabled={regenerateDisabled}
              >
                <RotateCcw /> {regenerateLabel}
              </Button>
            ) : null}
          </div>
          <details>
            <summary className="cursor-pointer text-xs">Detalhes do erro</summary>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
              {runtimeError}
            </pre>
          </details>
        </div>
      ) : null}
      {timedOut && !runtimeError ? (
        <div
          role="alert"
          className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>
            O preview não conseguiu carregar. Verifique sua conexão ou se alguma
            extensão está bloqueando scripts nesta página.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RotateCcw /> Recarregar preview
          </Button>
        </div>
      ) : null}
      <iframe
        key={reloadKey}
        title="Live preview"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        style={{ colorScheme: "light" }}
        className="h-80 w-full max-w-full rounded-lg border border-border bg-white"
      />
    </section>
  );
}
