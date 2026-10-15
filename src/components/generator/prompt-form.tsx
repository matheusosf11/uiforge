"use client";

import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLE_PROMPTS } from "@/lib/example-prompts";
import { MAX_PROMPT_LENGTH } from "@/lib/prompt-limits";
import { cn } from "@/lib/utils";

type PromptFormProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
};

export function PromptForm({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
}: PromptFormProps) {
  const canSubmit = !isLoading && value.trim() !== "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = EXAMPLE_PROMPTS.find(
    (e) => e.id === selectedId && e.prompt === value,
  );

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "Enter" &&
      canSubmit
    ) {
      event.preventDefault();
      setSelectedId(null);
      onSubmit();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSelectedId(null);
    onSubmit();
  }

  return (
    <section
      aria-label="Prompt"
      className="flex h-full min-h-64 flex-col rounded-xl border border-border bg-card p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Prompt</h2>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit}
      >
        <Textarea
          aria-label="Prompt"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={MAX_PROMPT_LENGTH}
          aria-describedby="prompt-char-count"
          placeholder="Descreva um componente de UI… (⌘/Ctrl+Enter para gerar)"
          className="min-h-32 flex-1 resize-none"
        />
        <p
          id="prompt-char-count"
          className="mt-1 text-right text-xs text-muted-foreground"
        >
          {value.length}/{MAX_PROMPT_LENGTH} caracteres
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((e) => (
            <button
              key={e.id}
              type="button"
              title={e.prompt}
              aria-label={`${e.label}: ${e.prompt}`}
              aria-pressed={selected?.id === e.id}
              disabled={isLoading}
              onClick={() => {
                setSelectedId(e.id);
                onChange(e.prompt);
              }}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "text-xs",
                selected?.id === e.id &&
                  "border-transparent bg-primary text-primary-foreground",
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(buttonVariants())}
          >
            Gerar
          </button>
          {isLoading ? (
            <Button type="button" variant="secondary" onClick={onStop}>
              Parar
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
