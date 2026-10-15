"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPreviewSrcdoc } from "@/lib/preview-srcdoc";
import { hasDefaultExport } from "@/lib/sandpack-files";

export function SandboxPreview({ code }: { code: string }) {
  const srcDoc = useMemo(() => buildPreviewSrcdoc(code), [code]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    setRuntimeError(null);
    function onMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "uiforge-preview-error") {
        setRuntimeError(String(event.data.message || "Erro no preview"));
      }
      if (event.data.type === "uiforge-preview-ready") {
        setRuntimeError(null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [code]);

  const missingDefault = !hasDefaultExport(code);

  return (
    <section
      aria-label="Live preview"
      className="flex min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        Preview
      </h2>
      {missingDefault ? (
        <p
          role="alert"
          className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          O código gerado não exporta um componente padrão.
        </p>
      ) : null}
      {runtimeError ? (
        <p
          role="alert"
          className="mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {runtimeError}
        </p>
      ) : null}
      <iframe
        title="Live preview"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className="h-80 w-full max-w-full rounded-lg border border-border bg-white"
      />
    </section>
  );
}
