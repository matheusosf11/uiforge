"use client";

import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode, Ref } from "react";
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
  /** "refine" swaps texts and replaces the example gallery with suggestions. */
  mode?: "generate" | "refine";
  /** Refine mode only: null renders loading skeletons, an array renders chips. */
  chips?: { id: string; label: string; prompt: string }[] | null;
  /** Rendered above the title row. */
  sessionBar?: ReactNode;
  /** Rendered between the sessionBar and the title (turn/version list). */
  turnList?: ReactNode;
  /** Shown under the title and wired to the textarea description; not a live region. */
  baseNotice?: string | null;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

const SKELETON_WIDTHS = ["w-24", "w-32", "w-28", "w-20"];

export function PromptForm({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  mode = "generate",
  chips,
  sessionBar,
  turnList,
  baseNotice,
  textareaRef,
}: PromptFormProps) {
  const refine = mode === "refine";
  const canSubmit = !isLoading && value.trim() !== "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const items = refine ? (chips ?? []) : EXAMPLE_PROMPTS;
  const showSkeleton = refine && chips == null;
  const selected = refine
    ? items.find((e) => e.prompt === value)
    : items.find((e) => e.id === selectedId && e.prompt === value);

  function setRefs(node: HTMLTextAreaElement | null) {
    innerRef.current = node;
    if (typeof textareaRef === "function") textareaRef(node);
    else if (textareaRef)
      (textareaRef as { current: HTMLTextAreaElement | null }).current = node;
  }

  function pick(prompt: string, id: string) {
    setSelectedId(id);
    onChange(prompt);
    const el = innerRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(prompt.length, prompt.length);
    }
  }

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
      {sessionBar}
      {turnList}
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        {refine ? "Refinar componente" : "Prompt"}
      </h2>
      {baseNotice ? (
        <p id="refine-base-notice" className="mb-2 text-xs text-muted-foreground">
          {baseNotice}
        </p>
      ) : null}
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit}
      >
        <Textarea
          ref={setRefs}
          aria-label={refine ? "Descreva a mudança" : "Prompt"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={MAX_PROMPT_LENGTH}
          aria-describedby={
            baseNotice
              ? "refine-base-notice prompt-char-count"
              : "prompt-char-count"
          }
          placeholder={
            refine
              ? "Descreva a mudança… (⌘/Ctrl+Enter para refinar)"
              : "Descreva um componente de UI… (⌘/Ctrl+Enter para gerar)"
          }
          className="min-h-32 flex-1 resize-none"
        />
        <p
          id="prompt-char-count"
          className="mt-1 text-right text-xs text-muted-foreground"
        >
          {value.length}/{MAX_PROMPT_LENGTH} caracteres
        </p>
        {showSkeleton ? (
          <div aria-busy="true" className="mt-3 flex min-h-8 flex-wrap gap-2">
            {SKELETON_WIDTHS.map((w) => (
              <div
                key={w}
                className={cn(
                  "h-8 rounded-lg bg-muted animate-pulse motion-reduce:animate-none max-md:min-h-11",
                  w,
                )}
              />
            ))}
          </div>
        ) : (
          <div
            role="group"
            aria-label={refine ? "Sugestões de refinamento" : "Exemplos"}
            className="mt-3 flex min-h-8 flex-wrap gap-2"
          >
            {items.map((e) => (
              <button
                key={e.id}
                type="button"
                title={e.prompt}
                aria-label={`${e.label}: ${e.prompt}`}
                aria-pressed={selected?.id === e.id}
                disabled={isLoading}
                onClick={() => pick(e.prompt, e.id)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "text-xs max-md:min-h-11",
                  selected?.id === e.id &&
                    "border-transparent bg-primary text-primary-foreground",
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(buttonVariants(), "max-md:min-h-11")}
          >
            {refine ? "Refinar" : "Gerar"}
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
