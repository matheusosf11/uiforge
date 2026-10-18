"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FilePlus2, RotateCcw } from "lucide-react";
import { CodeView } from "@/components/generator/code-view";
import { NewComponentDialog } from "@/components/generator/new-component-dialog";
import { PromptForm } from "@/components/generator/prompt-form";
import { SessionBar } from "@/components/generator/session-bar";
import { TurnList } from "@/components/generator/turn-list";
import type { TurnTransient } from "@/components/generator/turn-list";
import { useGeneratorSession } from "@/components/generator/use-generator-session";
import { useSuggestions } from "@/components/generator/use-suggestions";
import { useUndoShortcut } from "@/components/generator/use-undo-shortcut";
import { Button } from "@/components/ui/button";
import {
  CODE_TOO_LARGE_MESSAGE,
  friendlyGenerateError,
  GENERIC_ERROR_MESSAGE,
  REFINE_ERROR_MESSAGE,
} from "@/lib/generate-error";
import { parseCode } from "@/lib/parse-code";
import { currentNumber, laterRange } from "@/lib/session";
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

function PreviewPlaceholder({ text }: { text: string }) {
  return (
    <section
      aria-label="Live preview"
      className="flex min-h-64 flex-col rounded-xl border border-dashed border-border bg-muted/30 p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        Preview
      </h2>
      <p className="text-sm text-muted-foreground">{text}</p>
    </section>
  );
}

export function GeneratorShell() {
  const session = useGeneratorSession();
  const { state, committed, busy, canUndo } = session;
  const { pending, error, notice, versions, cursor } = state;
  const refineMode = versions.length > 0;
  // Stable display numbers (D-17): survive the MAX_VERSIONS cap.
  const n = currentNumber(state);
  const later = laterRange(state);

  const [tab, setTab] = useState<Tab>("preview");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    preview: null,
    code: null,
  });
  const [prompt, setPrompt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  // D-02: mobile history disclosure; only "Novo componente" collapses it.
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const newBtnRef = useRef<HTMLButtonElement | null>(null);

  const suggestions = useSuggestions(
    committed ? { id: committed.id, code: committed.code } : null,
  );
  const chips = useMemo(
    () =>
      committed && suggestions.suggestions
        ? suggestions.suggestions.map((s) => ({
            id: s.label,
            label: s.label,
            prompt: s.instruction,
          }))
        : null,
    [committed, suggestions.suggestions],
  );

  // D-14: stream the new code live; pending clears on failure/stop, which
  // reverts the panel to the last committed version.
  const codeForPanel = pending
    ? parseCode(pending.text)
    : (committed?.code ?? "");

  // Single source of the status text (D-16, D-20).
  let status = "";
  if (pending) status = committed ? "Refinando…" : "Gerando…";
  else if (notice === "committed") status = `Pronto — v${n}`;
  else if (notice === "undo") status = `Voltou para v${n}`;
  else if (notice === "forward") status = `Foi para v${n}`;
  else if (notice === "reset") status = "Novo componente iniciado";

  // D-09/D-10/D-11: streaming row while pending (Parar clears it); error row
  // only for a failed refine (a failed first generation has no list).
  const transient: TurnTransient = pending
    ? { kind: "gerando", instruction: pending.instruction }
    : error && versions.length > 0
      ? { kind: "erro", instruction: error.instruction }
      : null;

  // D-15: later versions are discarded only when a refine commits.
  let baseNotice: string | null = null;
  if (later) {
    baseNotice =
      later.from === later.to
        ? `Refinar a partir da v${n} — v${later.from} será descartada`
        : `Refinar a partir da v${n} — v${later.from} a v${later.to} serão descartadas`;
  }

  // D-12: scroll the code panel to the top after a restore/undo.
  const scrollResetKey =
    !pending && (notice === "undo" || notice === "forward")
      ? (committed?.id ?? null)
      : null;

  let errorMessage: string | null = null;
  if (error) {
    if (error.kind === "too_large") errorMessage = CODE_TOO_LARGE_MESSAGE;
    else if (error.kind === "rate_limit")
      errorMessage = friendlyGenerateError(new Error("rate_limited"));
    else
      errorMessage =
        error.baseId !== null ? REFINE_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
  }

  async function handleSubmit() {
    const outcome = await session.send(prompt.trim());
    // D-02: clear only when a version was committed.
    if (outcome === "committed") setPrompt("");
  }

  async function handleRetry() {
    const instruction = error?.instruction ?? "";
    const outcome = await session.retry();
    // D-02: a committed retry clears the field like a submit, unless the user
    // already edited it into a different draft meanwhile.
    if (outcome === "committed") {
      setPrompt((p) => (p.trim() === instruction.trim() ? "" : p));
    }
  }

  function doReset() {
    session.reset();
    suggestions.reset();
    setHistoryOpen(false);
    // D-13: prompt text is intentionally preserved.
  }

  function requestNew() {
    if (versions.length > 1) {
      setConfirmOpen(true);
    } else {
      doReset();
      textareaRef.current?.focus();
    }
  }

  useUndoShortcut({
    enabled: canUndo,
    dialogOpen: confirmOpen,
    onUndo: session.undo,
  });

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
          onStop={session.stop}
          isLoading={busy}
          mode={refineMode ? "refine" : "generate"}
          chips={refineMode ? chips : null}
          textareaRef={textareaRef}
          baseNotice={refineMode ? baseNotice : null}
          turnList={
            refineMode ? (
              <TurnList
                versions={versions}
                cursor={cursor}
                droppedCount={state.droppedCount}
                busy={busy}
                transient={transient}
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                onRestore={session.restore}
              />
            ) : null
          }
          sessionBar={
            refineMode ? (
              <SessionBar
                number={n ?? 1}
                total={versions.length}
                canUndo={canUndo}
                busy={busy}
                onUndo={session.undo}
                onNew={requestNew}
                newButtonRef={newBtnRef}
              />
            ) : null
          }
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
        {errorMessage ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
            {error?.kind === "too_large" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={requestNew}
                disabled={busy}
              >
                <FilePlus2 /> Novo componente
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => void handleRetry()}
                disabled={busy}
              >
                <RotateCcw /> Tentar de novo
              </Button>
            )}
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
          {committed ? (
            <SandboxPreview
              code={committed.code}
              updating={!!pending}
              regenerateLabel="Tentar de novo"
              // Mutually exclusive with the shell error banner's retry button.
              // WR-01: omitted when regenerating would discard later versions
              // or lacks a real base; refine and restore remain available.
              onRegenerate={
                error || !session.canRegenerate
                  ? undefined
                  : () => void session.regenerate()
              }
              regenerateDisabled={busy}
            />
          ) : pending ? (
            <PreviewPlaceholder text="Gerando preview…" />
          ) : (
            <PreviewPlaceholder text="O preview aparece aqui depois de gerar." />
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-code"
          aria-labelledby="tab-code"
          className={cn("min-h-0 min-w-0 flex-1", tab !== "code" && "max-md:hidden")}
        >
          <CodeView
            code={codeForPanel}
            busy={busy}
            scrollResetKey={scrollResetKey}
          />
        </div>
      </div>
      <NewComponentDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          doReset();
        }}
        finalFocusRef={newBtnRef}
        // Focus lands on the textarea via the dialog's finalFocus on confirm.
        confirmFocusRef={textareaRef}
      />
    </div>
  );
}
