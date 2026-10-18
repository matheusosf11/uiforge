"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreviewSrcdoc } from "@/lib/preview-srcdoc";
import { hasDefaultExport } from "@/lib/has-default-export";

export const PREVIEW_LOAD_TIMEOUT_MS = 15000;

/**
 * Two iframe slots: the front one stays visible while new code loads in the
 * hidden back one, which is promoted once it reports back (ready, error or
 * timeout). Swapping roles never reloads an iframe, so edits don't flash a
 * blank preview.
 */
type Frames = {
  front: 0 | 1;
  docs: [string | null, string | null];
  /** The srcdoc of the newest code (front, or back while pending). */
  latest: string;
};

// Sandboxed srcdoc frames have an opaque origin, serialized as "null".
export function isPreviewOrigin(origin: string): boolean {
  return origin === "null";
}

function initialFrames(srcDoc: string): Frames {
  return { front: 0, docs: [srcDoc, null], latest: srcDoc };
}

function promote(f: Frames): Frames {
  const back = f.front === 0 ? 1 : 0;
  if (f.docs[back] === null) return f;
  const docs: Frames["docs"] = [null, null];
  docs[back] = f.docs[back];
  return { ...f, front: back, docs };
}

export function SandboxPreview({
  code,
  onRegenerate,
  regenerateDisabled = false,
  updating = false,
  regenerateLabel = "Gerar de novo",
  errorSource = "ai",
}: {
  code: string;
  /** Offered when the generated code fails to compile/run in the preview. */
  onRegenerate?: () => void;
  regenerateDisabled?: boolean;
  /** Shows a non-live "Atualizando…" badge while a refinement streams. */
  updating?: boolean;
  /** Label of the runtime-error retry button. */
  regenerateLabel?: string;
  /**
   * Who wrote the code, for the error copy. "user" = the code comes from the
   * editor (a draft or a manual version); "ai" (default) = generated code.
   */
  errorSource?: "ai" | "user";
}) {
  const srcDoc = useMemo(() => buildPreviewSrcdoc(code), [code]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  // Bumped by "Recarregar preview" to remount the iframe and refetch the runtime.
  const [reloadKey, setReloadKey] = useState(0);
  const [frames, setFrames] = useState(() => initialFrames(srcDoc));
  const slotRefs = useRef<[HTMLIFrameElement | null, HTMLIFrameElement | null]>([
    null,
    null,
  ]);
  if (frames.latest !== srcDoc) {
    // New code: load it behind the visible preview (or show it directly when
    // it is what the front already holds).
    const back = frames.front === 0 ? 1 : 0;
    const docs: Frames["docs"] = [...frames.docs];
    if (frames.docs[frames.front] === srcDoc) docs[back] = null;
    else docs[back] = srcDoc;
    setFrames({ ...frames, docs, latest: srcDoc });
  }
  const framesRef = useRef(frames);
  framesRef.current = frames;

  useEffect(() => {
    setRuntimeError(null);
    setTimedOut(false);
    // A runtime script that never finishes loading (blocked or stalled network)
    // leaves the iframe blank without any error event, so watch for silence.
    const timer = window.setTimeout(() => {
      setFrames(promote);
      setTimedOut(true);
    }, PREVIEW_LOAD_TIMEOUT_MS);
    function onMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (
        event.data.type !== "uiforge-preview-error" &&
        event.data.type !== "uiforge-preview-ready"
      ) {
        return;
      }
      const [a, b] = slotRefs.current;
      const fromSlot =
        event.source && event.source === a?.contentWindow
          ? 0
          : event.source && event.source === b?.contentWindow
            ? 1
            : null;
      // Only our own preview frames may report: any other window (another
      // tab, an extension, a nested frame) is ignored. The frames are
      // sandboxed without allow-same-origin, so their origin is "null".
      if (fromSlot === null || !isPreviewOrigin(event.origin)) return;
      const f = framesRef.current;
      if (f.docs[f.front === 0 ? 1 : 0] !== null) {
        // A message from the old front while newer code loads is stale.
        if (fromSlot === f.front) return;
        setFrames(promote);
      }
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
  const userCode = errorSource === "user";
  const runtimeMessage = userCode
    ? "Seu código tem um erro e o preview não conseguiu rodar. Corrija no editor ou descreva a correção em Refinar."
    : "A IA gerou um código com erro e o preview não conseguiu rodar.";
  const missingDefaultMessage = userCode
    ? "O código não exporta um componente padrão. Adicione um export default ao componente."
    : "O código gerado não exporta um componente padrão.";

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
          {missingDefaultMessage}
        </p>
      ) : null}
      {runtimeError ? (
        <div
          role="alert"
          className="mb-2 flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{runtimeMessage}</p>
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
            onClick={() => {
              setFrames(initialFrames(srcDoc));
              setReloadKey((k) => k + 1);
            }}
          >
            <RotateCcw /> Recarregar preview
          </Button>
        </div>
      ) : null}
      <div className="relative flex-1">
        {([0, 1] as const).map((i) =>
          frames.docs[i] === null ? null : (
            <iframe
              key={`${reloadKey}-${i}`}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              title={i === frames.front ? "Live preview" : "Live preview (carregando)"}
              aria-hidden={i === frames.front ? undefined : true}
              tabIndex={i === frames.front ? undefined : -1}
              sandbox="allow-scripts"
              srcDoc={frames.docs[i] ?? undefined}
              style={{ colorScheme: "light" }}
              className={
                i === frames.front
                  ? "h-full min-h-80 w-full max-w-full rounded-lg border border-border bg-white"
                  : "pointer-events-none absolute inset-0 h-full min-h-80 w-full max-w-full rounded-lg border border-border bg-white opacity-0"
              }
            />
          ),
        )}
      </div>
    </section>
  );
}
