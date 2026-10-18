"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FilePlus2, RotateCcw } from "lucide-react";
import { CodeView } from "@/components/generator/code-view";
import { DiscardDraftDialog } from "@/components/generator/discard-draft-dialog";
import { NewComponentDialog } from "@/components/generator/new-component-dialog";
import { PanelBoard } from "@/components/generator/panel-board";
import { PromptForm } from "@/components/generator/prompt-form";
import { SessionBar } from "@/components/generator/session-bar";
import { TurnList } from "@/components/generator/turn-list";
import { useDebouncedDraft } from "@/components/generator/use-debounced-draft";
import type { TurnTransient } from "@/components/generator/turn-list";
import { useGeneratorSession } from "@/components/generator/use-generator-session";
import { useSuggestions } from "@/components/generator/use-suggestions";
import { useMediaQuery } from "@/components/generator/use-media-query";
import { useUndoShortcut } from "@/components/generator/use-undo-shortcut";
import { Button } from "@/components/ui/button";
import {
  CODE_TOO_LARGE_MESSAGE,
  friendlyGenerateError,
  GENERIC_ERROR_MESSAGE,
  REFINE_ERROR_MESSAGE,
} from "@/lib/generate-error";
import { parseCode } from "@/lib/parse-code";
import {
  imageDataUrl,
  MAX_IMAGES,
  prepareImage,
  PromptImageError,
  withPreviewImages,
  type PromptImage,
} from "@/lib/prompt-image";
import {
  currentNumber,
  laterRange,
  MAX_VERSIONS,
  versionNumber,
} from "@/lib/session";
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
  // Desktop: draggable cards. Phones (and the first render) keep the tabs.
  const boardEnabled = useMediaQuery("(min-width: 768px)");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    preview: null,
    code: null,
  });
  const [prompt, setPrompt] = useState("");
  // Reference images attached to the next send; cleared when it commits.
  const [images, setImages] = useState<PromptImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  // Images of the last send in this session: the preview shows image N
  // wherever the code uses its token. "Novo componente" forgets them.
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // D-02: mobile history disclosure; only "Novo componente" collapses it.
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const newBtnRef = useRef<HTMLButtonElement | null>(null);
  // D-09: pending "go to a later version" while a draft exists.
  const [discardTarget, setDiscardTarget] = useState<{
    id: number;
    number: number;
  } | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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

  // D-06: shell-only draft of the current version. Text equal to the base is
  // no draft; a draft whose base is no longer current never renders.
  const [draft, setDraft] = useState<{ baseId: number; code: string } | null>(
    null,
  );
  const dirty =
    !!draft &&
    !!committed &&
    !pending &&
    draft.baseId === committed.id &&
    draft.code !== committed.code;
  // IN-03: an empty (whitespace-only) draft is never committed; actions treat
  // it as no draft and run from the committed code, which discards it.
  const draftCode = dirty && draft.code.trim() ? draft.code : null;

  // Drop a stale draft once the committed id moves away from its base (send,
  // retry, REJECT, plain restore/undo). Flows that return to the draft's own
  // base id (commit-then-undo/restore) clear it explicitly in their handlers.
  const committedId = committed?.id ?? null;
  useEffect(() => {
    if (draft && draft.baseId !== committedId) setDraft(null);
  }, [draft, committedId]);

  // D-14/D-05: stream the new code live; pending clears on failure/stop, which
  // reverts the panel to the last committed version (or its draft). WR-03:
  // until the first parsed chunk arrives, keep showing the committed code so
  // the editor never flashes empty at the start of a refine.
  const streamed = pending ? parseCode(pending.text) : "";
  const editorValue = pending
    ? streamed || (committed?.code ?? "")
    : (draftCode ?? committed?.code ?? "");

  // D-11: the preview follows the draft 500 ms after the last keystroke;
  // null (discard, commit, restore, reset) passes through immediately.
  const debounced = useDebouncedDraft(dirty ? draft : null, 500);
  const previewCode = withPreviewImages(
    dirty && debounced && committed && debounced.baseId === committed.id
      ? debounced.code
      : (committed?.code ?? ""),
    previewImages,
  );

  function handleEditorChange(next: string) {
    if (!committed || busy) return;
    setDraft(next === committed.code ? null : { baseId: committed.id, code: next });
  }

  // Changes on every commit and navigation, even when the committed id ends
  // up the same (nextVersionId moved), so the editor's Ctrl+Z never brings
  // back committed draft text (P3).
  const versionKey = pending
    ? `p${pending.id}`
    : committed
      ? `${committed.id}:${state.nextVersionId}:${state.cursor}`
      : null;
  // IN-01: a discard also resets the editor history, so Ctrl+Z after
  // discarding and typing never brings the discarded draft back. Kept out of
  // versionKey so a discard does not trigger the scroll reset.
  const [discards, setDiscards] = useState(0);
  const historyKey = versionKey === null ? null : `${versionKey}:d${discards}`;

  function handleDiscard() {
    setDraft(null);
    setDiscards((d) => d + 1);
  }

  // Single source of the status text (D-16, D-20). D-15: a manual version
  // saved by the same action prefixes the follow-up (React batches the
  // commit and the action into one render, so the status is composite).
  const savedIndex =
    state.savedManualId === null
      ? -1
      : versions.findIndex((v) => v.id === state.savedManualId);
  const saved =
    savedIndex >= 0
      ? `Edição salva como v${versionNumber(state, savedIndex)}`
      : null;
  const prefix = saved ? `${saved} · ` : "";
  let status = "";
  if (pending) status = prefix + (committed ? "Refinando…" : "Gerando…");
  else if (notice === "manual") status = saved ?? "";
  else if (notice === "committed") status = `Pronto — v${n}`;
  else if (notice === "undo") status = prefix + `Voltou para v${n}`;
  else if (notice === "forward") status = prefix + `Foi para v${n}`;
  else if (notice === "reset") status = "Novo componente iniciado";

  // D-09/D-10/D-11: streaming row while pending (Parar clears it); error row
  // only for a failed refine (a failed first generation has no list).
  // D-14: precedence gerando > rascunho > erro.
  const transient: TurnTransient = pending
    ? { kind: "gerando", instruction: pending.instruction }
    : dirty
      ? { kind: "rascunho", instruction: "" }
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
    !pending && (notice === "undo" || notice === "forward") ? versionKey : null;

  let errorMessage: string | null = null;
  if (error) {
    if (error.kind === "too_large") errorMessage = CODE_TOO_LARGE_MESSAGE;
    else if (error.kind === "rate_limit")
      errorMessage = friendlyGenerateError(new Error("rate_limited"));
    else
      errorMessage =
        error.baseId !== null ? REFINE_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
  }

  // Shrinks the picked files one by one, up to the free slots; the first
  // refusal (wrong type, too many) is shown and the rest still attach.
  async function handleAttachImages(files: File[]) {
    setImageError(null);
    const free = MAX_IMAGES - images.length;
    if (free <= 0) {
      setImageError(`Você pode anexar no máximo ${MAX_IMAGES} imagens.`);
      return;
    }
    setImageBusy(true);
    let error: string | null =
      files.length > free
        ? `Você pode anexar no máximo ${MAX_IMAGES} imagens; as extras foram ignoradas.`
        : null;
    const added: PromptImage[] = [];
    for (const file of files.slice(0, free)) {
      try {
        added.push(await prepareImage(file));
      } catch (err) {
        error ??=
          err instanceof PromptImageError
            ? err.message
            : "Não foi possível usar essa imagem.";
      }
    }
    setImages((current) => [...current, ...added].slice(0, MAX_IMAGES));
    setImageError(error);
    setImageBusy(false);
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
    setImageError(null);
  }

  // Sends with the attached images. The preview switches to them as soon as
  // the request starts (the new code streams in), and goes back to the
  // previous ones when nothing was committed.
  async function sendWithImages(
    request: (imgs: PromptImage[]) => Promise<string>,
  ) {
    const sent = images;
    const before = previewImages;
    if (sent.length > 0) setPreviewImages(sent.map(imageDataUrl));
    const outcome = await request(sent);
    if (outcome === "committed") {
      if (sent.length > 0) setImages((i) => (i === sent ? [] : i));
    } else if (sent.length > 0) {
      setPreviewImages(before);
    }
    return outcome;
  }

  async function handleSubmit() {
    // D-07/D-10: the draft (broken or oversized, as-is) is committed as a
    // manual version only when the refine actually starts.
    const outcome = await sendWithImages((imgs) =>
      session.send(prompt.trim(), draftCode, imgs),
    );
    // D-02: clear only when a version was committed.
    if (outcome === "committed") setPrompt("");
  }

  async function handleRetry() {
    const instruction = error?.instruction ?? "";
    const outcome = await sendWithImages((imgs) =>
      session.retry(draftCode, imgs),
    );
    // D-02: a committed retry clears the field like a submit, unless the user
    // already edited it into a different draft meanwhile.
    if (outcome === "committed") {
      setPrompt((p) => (p.trim() === instruction.trim() ? "" : p));
    }
  }

  // D-07: commit the draft, then undo. COMMIT_MANUAL + UNDO lands back on the
  // draft's base id, so the stale-draft effect cannot fire; clear explicitly
  // (a draft never survives an undo) so a second Desfazer never duplicates.
  function handleUndo() {
    session.undo(draftCode);
    setDraft(null);
  }

  function handleRestore(versionId: number) {
    const idx = versions.findIndex((v) => v.id === versionId);
    // WR-01: committing right after a cursor at the cap evicts versions[0],
    // so restoring the oldest version would silently land on the new manual
    // version instead. Treat it like a later version: ask, no commit.
    const evictsTarget = dirty && idx === 0 && cursor + 2 > MAX_VERSIONS;
    if (dirty && (idx > cursor || evictsTarget)) {
      // D-09: going forward would drop the draft; ask first, no commit.
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setDiscardTarget({ id: versionId, number: versionNumber(state, idx) });
      return;
    }
    // D-07/D-08: commit the draft (truncating later versions), then restore.
    session.restore(versionId, draftCode);
    setDraft(null);
  }

  function confirmDiscard() {
    if (!discardTarget) return;
    const id = discardTarget.id;
    setDraft(null);
    setDiscardTarget(null);
    session.restore(id);
  }

  function doReset() {
    session.reset();
    setDraft(null);
    suggestions.reset();
    setHistoryOpen(false);
    setPreviewImages([]);
    // D-13: prompt text (and attached images) is intentionally preserved.
  }

  function requestNew() {
    // D-07: a draft counts as manual work (Phase 6 D-12).
    if (versions.length > 1 || dirty) {
      setConfirmOpen(true);
    } else {
      doReset();
      textareaRef.current?.focus();
    }
  }

  // Desfazer also works on v1 while a draft exists.
  const undoEnabled = canUndo || (dirty && !busy);

  useUndoShortcut({
    enabled: undoEnabled,
    dialogOpen: confirmOpen || discardTarget !== null,
    onUndo: handleUndo,
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

  const promptPanel = (
    <PromptForm
      value={prompt}
      onChange={setPrompt}
      onSubmit={handleSubmit}
      onStop={session.stop}
      isLoading={busy}
      mode={refineMode ? "refine" : "generate"}
      chips={refineMode ? chips : null}
      textareaRef={textareaRef}
      images={images.map((img) => ({ name: img.name, src: imageDataUrl(img) }))}
      onAttachImages={(files) => void handleAttachImages(files)}
      onRemoveImage={removeImage}
      imageError={imageError}
      imageBusy={imageBusy}
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
            onRestore={handleRestore}
            draftActive={dirty}
          />
        ) : null
      }
      sessionBar={
        refineMode ? (
          <SessionBar
            number={n ?? 1}
            total={versions.length}
            canUndo={undoEnabled}
            busy={busy}
            onUndo={handleUndo}
            onNew={requestNew}
            newButtonRef={newBtnRef}
          />
        ) : null
      }
    />
  );

  const statusAndError = (
    <>
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
    </>
  );

  const previewPanel = (
    committed ? (
      <SandboxPreview
        code={previewCode}
        updating={!!pending}
        // D-12: errors in a draft or a manual version are the user's code.
        errorSource={
          dirty || committed.source === "manual" ? "user" : "ai"
        }
        regenerateLabel="Tentar de novo"
        // Mutually exclusive with the shell error banner's retry button.
        // WR-01: omitted when regenerating would discard later versions
        // or lacks a real base; refine and restore remain available.
        // D-12: also omitted while a draft exists (canRegenerate is
        // already false on a manual version).
        onRegenerate={
          error || !session.canRegenerate || dirty
            ? undefined
            : () => void session.regenerate()
        }
        regenerateDisabled={busy}
      />
    ) : pending ? (
      <PreviewPlaceholder text="Gerando preview…" />
    ) : (
      <PreviewPlaceholder text="O preview aparece aqui depois de gerar." />
    )
  );

  const codePanel = (
    <CodeView
      code={editorValue}
      busy={busy}
      scrollResetKey={scrollResetKey}
      onChange={handleEditorChange}
      readOnly={busy || !committed}
      dirty={dirty}
      onDiscard={handleDiscard}
      historyKey={historyKey}
    />
  );

  const dialogs = (
    <>
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
      <DiscardDraftDialog
        open={discardTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDiscardTarget(null);
        }}
        onConfirm={confirmDiscard}
        baseNumber={n ?? 1}
        targetNumber={discardTarget?.number ?? 1}
        finalFocusRef={restoreFocusRef}
      />
    </>
  );

  if (boardEnabled) {
    return (
      <>
        <PanelBoard
          toolbar={statusAndError}
          panels={{ prompt: promptPanel, preview: previewPanel, code: codePanel }}
        />
        {dialogs}
      </>
    );
  }

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 md:grid-cols-2">
      <div className="order-2 min-w-0 md:order-1">{promptPanel}</div>
      <div className="order-1 flex min-h-64 min-w-0 flex-col gap-3 md:order-2">
        {statusAndError}
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
          {previewPanel}
        </div>
        <div
          role="tabpanel"
          id="panel-code"
          aria-labelledby="tab-code"
          className={cn("min-h-0 min-w-0 flex-1", tab !== "code" && "max-md:hidden")}
        >
          {codePanel}
        </div>
      </div>
      {dialogs}
    </div>
  );
}
