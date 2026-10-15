"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcw } from "lucide-react";
import { useCompletion } from "@ai-sdk/react";
import { CodeView } from "@/components/generator/code-view";
import { PromptForm } from "@/components/generator/prompt-form";
import { Button } from "@/components/ui/button";
import {
  friendlyGenerateError,
  GENERIC_ERROR_MESSAGE,
} from "@/lib/generate-error";
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

export function GeneratorShell() {
  const stoppedRef = useRef(false);
  const failedRef = useRef(false);
  const lastPromptRef = useRef("");
  // Identifies the current request so a stale IIFE (e.g. after "Parar" and a
  // quick resend) never touches refs/state of the newer generation.
  const requestIdRef = useRef(0);
  const [tab, setTab] = useState<Tab>("preview");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    preview: null,
    code: null,
  });
  const [inFlight, setInFlight] = useState(false);
  const [friendly, setFriendly] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const [prompt, setPrompt] = useState("");
  const { completion, complete, isLoading, stop } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onError(err) {
      if (stoppedRef.current || err.name === "AbortError") return;
      failedRef.current = true;
      setFriendly(friendlyGenerateError(err));
    },
  });

  const busy = isLoading || inFlight;
  const parsed = useMemo(() => parseCode(completion), [completion]);
  const status = busy ? "Gerando…" : finished ? "Pronto" : "";
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
      // A mid-stream failure (body errored after the first token) leaves
      // truncated code in `completion`; don't promote it to the preview.
      setPreviewCode(!failedRef.current && parsed.trim() ? parsed : null);
    }
  }, [isLoading, parsed]);

  function send(text: string) {
    if (!text || busy) return;
    stoppedRef.current = false;
    failedRef.current = false;
    lastPromptRef.current = text;
    setFriendly(null);
    setFinished(false);
    setInFlight(true);
    const id = ++requestIdRef.current;
    const isCurrent = () => id === requestIdRef.current;
    void (async () => {
      try {
        const result = await complete(text);
        if (!isCurrent() || stoppedRef.current) return;
        if (!(result ?? "").trim()) {
          failedRef.current = true;
          setFriendly((current) => current ?? GENERIC_ERROR_MESSAGE);
        } else if (!failedRef.current) {
          setFinished(true);
        }
      } catch (err) {
        if (
          !isCurrent() ||
          stoppedRef.current ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        failedRef.current = true;
        setFriendly(friendlyGenerateError(err));
      } finally {
        if (isCurrent()) setInFlight(false);
      }
    })();
  }

  function handleSubmit() {
    send(prompt.trim());
  }

  function retry() {
    send(lastPromptRef.current);
  }

  function handleStop() {
    stoppedRef.current = true;
    requestIdRef.current += 1;
    stop();
    setFriendly(null);
    setFinished(false);
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
        <p
          aria-live="polite"
          aria-atomic="true"
          className="min-h-5 text-sm text-muted-foreground"
        >
          {status}
        </p>
        {friendly ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
            <p role="alert" className="text-sm text-destructive">
              {friendly}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={retry}
              disabled={busy}
            >
              <RotateCcw /> Tentar de novo
            </Button>
          </div>
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
