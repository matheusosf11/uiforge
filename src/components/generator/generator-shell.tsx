"use client";

import { useMemo, useRef, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { CodeView } from "@/components/generator/code-view";
import { PromptForm } from "@/components/generator/prompt-form";
import { parseCode } from "@/lib/parse-code";

const FALLBACK_ERROR = "Falha ao gerar o componente. Tente novamente.";

export function GeneratorShell() {
  const stoppedRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { completion, input, setInput, complete, isLoading, stop, error } =
    useCompletion({
      api: "/api/generate",
      streamProtocol: "text",
      onError(err) {
        setSubmitError(err.message || FALLBACK_ERROR);
      },
    });

  const parsed = useMemo(() => parseCode(completion), [completion]);
  const visibleError = error?.message || submitError;

  function handleSubmit() {
    const prompt = input.trim();
    if (!prompt || isLoading) return;
    stoppedRef.current = false;
    setSubmitError(null);
    void (async () => {
      try {
        const result = await complete(prompt);
        if (!stoppedRef.current && !(result ?? "").trim()) {
          setSubmitError((current) => current ?? FALLBACK_ERROR);
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : FALLBACK_ERROR,
        );
      }
    })();
  }

  function handleStop() {
    stoppedRef.current = true;
    stop();
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
      <PromptForm
        value={input}
        onChange={(value) => setInput(value)}
        onSubmit={handleSubmit}
        onStop={handleStop}
        isLoading={isLoading}
      />
      <div className="flex min-h-64 flex-col gap-3">
        {visibleError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {visibleError}
          </p>
        ) : null}
        <div className="min-h-0 flex-1">
          <CodeView code={parsed} />
        </div>
      </div>
    </div>
  );
}
