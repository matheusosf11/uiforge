"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useCompletion } from "@ai-sdk/react";
import { CodeView } from "@/components/generator/code-view";
import { PromptForm } from "@/components/generator/prompt-form";
import { parseCode } from "@/lib/parse-code";
import { cn } from "@/lib/utils";

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

type Tab = "preview" | "code";

const FALLBACK_ERROR = "Falha ao gerar o componente. Tente novamente.";

export function GeneratorShell() {
  const stoppedRef = useRef(false);
  const [tab, setTab] = useState<Tab>("preview");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    preview: null,
    code: null,
  });
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

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "preview" ? "code" : "preview";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  const tabClass = (selected: boolean) =>
    cn(
      "h-11 rounded-md text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50",
      selected
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground",
    );

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 md:grid-cols-2">
      <div className="order-2 min-w-0 md:order-1">
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
        <div
          role="tablist"
          aria-label="Resultado"
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 md:hidden"
        >
          <button
            type="button"
            role="tab"
            id="tab-preview"
            ref={(el) => {
              tabRefs.current.preview = el;
            }}
            aria-controls="panel-preview"
            aria-selected={tab === "preview"}
            tabIndex={tab === "preview" ? 0 : -1}
            className={tabClass(tab === "preview")}
            onClick={() => setTab("preview")}
            onKeyDown={handleTabKeyDown}
          >
            Preview
          </button>
          <button
            type="button"
            role="tab"
            id="tab-code"
            ref={(el) => {
              tabRefs.current.code = el;
            }}
            aria-controls="panel-code"
            aria-selected={tab === "code"}
            tabIndex={tab === "code" ? 0 : -1}
            className={tabClass(tab === "code")}
            onClick={() => setTab("code")}
            onKeyDown={handleTabKeyDown}
          >
            Código
          </button>
        </div>
        <div
          role="tabpanel"
          id="panel-preview"
          aria-labelledby="tab-preview"
          className={cn("min-w-0", tab !== "preview" && "max-md:hidden")}
        >
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
        </div>
        <div
          role="tabpanel"
          id="panel-code"
          aria-labelledby="tab-code"
          className={cn("min-h-0 min-w-0 flex-1", tab !== "code" && "max-md:hidden")}
        >
          <CodeView code={parsed} busy={busy} />
        </div>
      </div>
    </div>
  );
}
