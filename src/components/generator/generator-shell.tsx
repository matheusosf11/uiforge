"use client";

import { useMemo } from "react";
import { useCompletion } from "@ai-sdk/react";
import { CodeView } from "@/components/generator/code-view";
import { PromptForm } from "@/components/generator/prompt-form";
import { parseCode } from "@/lib/parse-code";

export function GeneratorShell() {
  const { completion, input, setInput, complete, isLoading, stop, error } =
    useCompletion({
      api: "/api/generate",
      streamProtocol: "text",
    });

  const parsed = useMemo(() => parseCode(completion), [completion]);

  function handleSubmit() {
    const prompt = input.trim();
    if (!prompt || isLoading) return;
    void complete(prompt);
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
      <PromptForm
        value={input}
        onChange={(value) => setInput(value)}
        onSubmit={handleSubmit}
        onStop={stop}
        isLoading={isLoading}
      />
      <div className="flex min-h-64 flex-col gap-3">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error.message ||
              "Falha ao gerar o componente. Tente novamente."}
          </p>
        ) : null}
        <div className="min-h-0 flex-1">
          <CodeView code={parsed} />
        </div>
      </div>
    </div>
  );
}
