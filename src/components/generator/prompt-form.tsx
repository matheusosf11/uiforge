"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "Enter" &&
      canSubmit
    ) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
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
          placeholder="Descreva um componente de UI… (⌘/Ctrl+Enter para gerar)"
          className="min-h-32 flex-1 resize-none"
        />
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
