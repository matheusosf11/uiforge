"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useCompletion } from "@ai-sdk/react";
import { CodeView } from "@/components/generator/code-view";
import { PromptForm } from "@/components/generator/prompt-form";
import { parseCode } from "@/lib/parse-code";

const SandboxPreview = dynamic(
  () =>
    import("@/components/generator/sandbox-preview").then(
      (m) => m.SandboxPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Gerando preview…</p>
    ),
  },
);

const FALLBACK_ERROR = "Falha ao gerar o componente. Tente novamente.";

export function GeneratorShell() {
  const stoppedRef = useRef(false);
  const [inFlight, setInFlight] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const { completion, complete, isLoading, stop, error } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onError(err) {
      setSubmitError(err.message || FALLBACK_ERROR);
    },
  });

  const busy = isLoading || inFlight;
  const parsed = useMemo(() => parseCode(completion), [completion]);
  const visibleError = error?.message || submitError;
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isLoading) {
      wasLoading.current = true;
      return;
    }
    if (wasLoading.current) {
      wasLoading.current = false;
      setInFlight(false);
      setPreviewCode(parsed.trim() ? parsed : null);
    }
  }, [isLoading, parsed]);

  function handleSubmit() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt || busy) return;
    stoppedRef.current = false;
    setInFlight(true);
    setSubmitError(null);
    void (async () => {
      try {
        const result = await complete(nextPrompt);
        if (!stoppedRef.current && !(result ?? "").trim()) {
          setSubmitError((current) => current ?? FALLBACK_ERROR);
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : FALLBACK_ERROR,
        );
      } finally {
        setInFlight(false);
      }
    })();
  }

  function handleStop() {
    stoppedRef.current = true;
    stop();
    setInFlight(false);
  }

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 md:grid-cols-2">
      <div className="order-3 min-w-0 md:order-1">
        <PromptForm
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          onStop={handleStop}
          isLoading={busy}
        />
      </div>
      <div className="order-1 flex min-h-64 min-w-0 flex-col gap-3 md:order-2">
        {visibleError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {visibleError}
          </p>
        ) : null}
        {isLoading ? (
          <section
            aria-label="Live preview"
            className="flex min-h-64 flex-col rounded-xl border border-dashed border-border bg-muted/30 p-4"
          >
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Preview
            </h2>
            <p className="text-sm text-muted-foreground">Gerando preview…</p>
          </section>
        ) : previewCode ? (
          <SandboxPreview code={previewCode} />
        ) : (
          <section
            aria-label="Live preview"
            className="flex min-h-64 flex-col rounded-xl border border-dashed border-border bg-muted/30 p-4"
          >
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Preview
            </h2>
            <p className="text-sm text-muted-foreground">
              O preview aparece aqui depois de gerar.
            </p>
          </section>
        )}
        <div className="min-h-0 flex-1">
          <CodeView code={parsed} />
        </div>
      </div>
    </div>
  );
}
