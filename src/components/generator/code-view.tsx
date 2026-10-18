"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Highlight, themes } from "prism-react-renderer";
import Editor from "react-simple-code-editor";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  GitCompare,
  Paintbrush,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { UsageDialog } from "@/components/generator/usage-dialog";
import { Button } from "@/components/ui/button";
import { componentFilename } from "@/lib/download-filename";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

/** What the panel shows: the editor, a version diff or the visual editor. */
export type CodeMode = "code" | "compare" | "visual";

type EditorHandle = {
  session: {
    history: {
      stack: {
        value: string;
        selectionStart: number;
        selectionEnd: number;
        timestamp: number;
      }[];
      offset: number;
    };
  };
};

// The app renders a single CodeView, so fixed ids are safe.
const EDITOR_ID = "code-editor";
const HINT_ID = "code-editor-hint";
const TITLE_ID = "code-panel-title";

const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta"]);

// Key codes the library rewrites the value on (bracket/quote wrapping of a
// selection), read from react-simple-code-editor 0.14.1 handleKeyDown.
const KEYCODE_PARENS = 57;
const KEYCODE_BRACKETS = 219;
const KEYCODE_QUOTE = 222;
const KEYCODE_BACK_QUOTE = 192;
const KEYCODE_Y = 89;
const KEYCODE_Z = 90;

/**
 * True for keys the library would use to rewrite the value even though the
 * textarea is readOnly (P1). Tab, Escape, arrows, copy, select-all and any other
 * browser shortcut are never matched, so focus is never trapped (Escape is
 * handled separately by the read-only guard).
 */
function rewritesValue(e: KeyboardEvent<HTMLElement>): boolean {
  if (e.key === "Enter" || e.key === "Backspace") return true;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.keyCode === KEYCODE_Z || e.keyCode === KEYCODE_Y)) return true;
  // The handler is only attached to the textarea.
  const { selectionStart, selectionEnd } = e.currentTarget as HTMLTextAreaElement;
  const wraps =
    e.keyCode === KEYCODE_BRACKETS ||
    e.keyCode === KEYCODE_QUOTE ||
    e.keyCode === KEYCODE_BACK_QUOTE ||
    (e.keyCode === KEYCODE_PARENS && e.shiftKey);
  // The library only wraps when text is selected.
  return wraps && selectionStart !== selectionEnd;
}

export function CodeView({
  code,
  busy = false,
  scrollResetKey = null,
  onChange,
  readOnly: readOnlyProp,
  dirty = false,
  onDiscard,
  historyKey,
  compare = null,
  visual = null,
  mode = "code",
  onModeChange,
}: {
  /** Value shown: the draft, the committed version or the streaming code. */
  code: string;
  /** Disables Copiar/Baixar; keeps the editor mounted even while empty. */
  busy?: boolean;
  /** Changing to a new non-null value scrolls the code back to the top (D-12). */
  scrollResetKey?: string | number | null;
  /** User edits. Without it the editor is read-only. */
  onChange?: (code: string) => void;
  /** Defaults to busy || !onChange. */
  readOnly?: boolean;
  /** Shows the "Editado" badge and "Descartar edições". */
  dirty?: boolean;
  onDiscard?: () => void;
  /** Any change resets the editor's own undo history (P3). */
  historyKey?: string | number | null;
  /** Version comparison shown instead of the editor; null hides "Comparar". */
  compare?: ReactNode;
  /** Visual editor shown instead of the editor; null hides "Visual". */
  visual?: ReactNode;
  mode?: CodeMode;
  onModeChange?: (mode: CodeMode) => void;
}) {
  const readOnly = readOnlyProp ?? (busy || !onChange);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [exitMode, setExitMode] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const usageBtnRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prismTheme =
    mounted && resolvedTheme === "light" ? themes.nightOwlLight : themes.nightOwl;

  // WR-03: the editor (and its hint) stays mounted while streaming, even
  // before the first chunk, so focus and layout survive the start of a run.
  // Only the idle, empty, read-only state (no version yet) shows the
  // placeholder.
  const showEditor = code !== "" || !readOnly || busy;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // aria-* props on <Editor> land on its wrapper div, not the textarea (P2),
  // so link the hint imperatively.
  useLayoutEffect(() => {
    if (!showEditor) return;
    document.getElementById(EDITOR_ID)?.setAttribute("aria-describedby", HINT_ID);
  }, [showEditor]);

  // Reset the library's undo stack on every base change so Ctrl+Z never
  // resurrects another version's text (P3). Not a key remount: that drops focus.
  useLayoutEffect(() => {
    if (historyKey === undefined) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.session = {
      history: {
        stack: [{ value: code, selectionStart: 0, selectionEnd: 0, timestamp: 0 }],
        offset: 0,
      },
    };
    // Only the base identity matters; `code` is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyKey]);

  // Layout effect so the reset lands before paint (no one-frame flash at the
  // previous version's offset, D-12).
  useLayoutEffect(() => {
    if (scrollResetKey === null) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const textarea = document.getElementById(EDITOR_ID);
    if (textarea instanceof HTMLTextAreaElement) textarea.setSelectionRange(0, 0);
  }, [scrollResetKey]);

  const disabled = busy || !code.trim();
  const showDraftControls = dirty && !readOnly;

  function scheduleCopyReset() {
    timeoutRef.current = window.setTimeout(() => {
      setCopyState("idle");
      timeoutRef.current = null;
    }, 2000);
  }

  async function handleCopy() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      scheduleCopyReset();
    } catch {
      const textarea = document.getElementById(EDITOR_ID);
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
        textarea.select();
      }
      setCopyState("failed");
      // Return to "Copiar" too, so the button isn't stuck on the failure label.
      scheduleCopyReset();
    }
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = componentFilename(code);
    // Attach before clicking (some Firefox versions ignore detached anchors)
    // and revoke asynchronously so the download can start first (Safari).
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function handleDiscard() {
    onDiscard?.();
    // The button unmounts with the draft, so hand focus to the editor.
    window.requestAnimationFrame(() => {
      const textarea = document.getElementById(EDITOR_ID);
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
        textarea.setSelectionRange(0, 0);
      }
    });
  }

  // Typed as HTMLElement: the library types onKeyDown as div & textarea handler.
  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (readOnly) {
      // P1: the native readOnly attribute blocks typing; block only the keys
      // the library itself would use to rewrite the value, and Escape, whose
      // library blur() would drop focus to <body> (WR-02). Tab still passes
      // through (ignoreTabKey), so focus is never trapped.
      if (e.key === "Escape" || rewritesValue(e)) e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      // Stops the library's blur(); the next Tab / Shift+Tab leaves the editor.
      e.preventDefault();
      setExitMode(true);
      return;
    }
    // Shift of Shift+Tab must not leave exit mode.
    if (e.key !== "Tab" && !MODIFIERS.has(e.key)) setExitMode(false);
  }

  return (
    <section
      aria-labelledby={TITLE_ID}
      className="flex h-full min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id={TITLE_ID} className="text-sm font-medium text-muted-foreground">
            Código
          </h2>
          {showDraftControls ? (
            <span className="inline-flex h-5 items-center rounded-md bg-muted px-2 text-xs leading-5 font-medium text-foreground">
              Editado
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {visual !== null && onModeChange ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "text-xs max-md:min-h-11",
                mode === "visual" && "bg-muted text-foreground",
              )}
              aria-pressed={mode === "visual"}
              disabled={busy}
              onClick={() => onModeChange(mode === "visual" ? "code" : "visual")}
              title="Ajustar cores, cantos, espaçamento e fonte sem prompt"
            >
              <Paintbrush aria-hidden />
              Visual
            </Button>
          ) : null}
          {compare !== null && onModeChange ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "text-xs max-md:min-h-11",
                mode === "compare" && "bg-muted text-foreground",
              )}
              aria-pressed={mode === "compare"}
              disabled={busy}
              onClick={() => onModeChange(mode === "compare" ? "code" : "compare")}
              title="Comparar duas versões"
            >
              <GitCompare aria-hidden />
              Comparar
            </Button>
          ) : null}
          {showDraftControls && onDiscard ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs max-md:min-h-11"
              onClick={handleDiscard}
            >
              <X aria-hidden />
              Descartar edições
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs max-md:min-h-11"
            disabled={disabled}
            onClick={handleCopy}
          >
            {copyState === "copied" ? <Check /> : <Copy />}
            {copyState === "copied"
              ? "Copiado"
              : copyState === "failed"
                ? "Não foi possível copiar"
                : "Copiar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs max-md:min-h-11"
            disabled={disabled}
            onClick={handleDownload}
          >
            <Download />
            Baixar
          </Button>
          <Button
            ref={usageBtnRef}
            type="button"
            variant="outline"
            size="sm"
            className="text-xs max-md:min-h-11"
            disabled={disabled}
            onClick={() => setUsageOpen(true)}
            title="Instruções e pacote .zip para usar em outro projeto"
          >
            <BookOpen aria-hidden />
            Como usar
          </Button>
        </div>
      </div>
      {mode === "compare" && compare !== null ? (
        compare
      ) : mode === "visual" && visual !== null ? (
        visual
      ) : showEditor ? (
        <>
          <label htmlFor={EDITOR_ID} className="sr-only">
            Editor de código
          </label>
          <div
            ref={scrollRef}
            data-testid="code-scroll"
            className="max-h-[70vh] flex-1 overflow-auto rounded-lg focus-within:ring-3 focus-within:ring-ring/50"
            style={{ backgroundColor: prismTheme.plain.backgroundColor }}
          >
            <Editor
              ref={editorRef}
              value={code}
              onValueChange={(next) => {
                // P1: the library edits on Tab/Enter/Ctrl+Z even when readOnly.
                if (!readOnly) onChange?.(next);
              }}
              readOnly={readOnly}
              ignoreTabKey={readOnly || exitMode}
              tabSize={2}
              insertSpaces
              padding={12}
              textareaId={EDITOR_ID}
              textareaClassName="outline-none"
              className="min-h-full font-mono text-xs leading-relaxed max-md:text-base"
              style={{
                ...prismTheme.plain,
                caretColor: prismTheme.plain.color,
                tabSize: 2,
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setExitMode(false)}
              onBlur={() => setExitMode(false)}
              highlight={(value) => (
                <Highlight code={value} language="tsx" theme={prismTheme}>
                  {({ tokens, getLineProps, getTokenProps }) => (
                    <>
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </Highlight>
              )}
            />
          </div>
          <p id={HINT_ID} className="mt-2 text-xs text-muted-foreground">
            Esc e depois Tab para sair
          </p>
        </>
      ) : (
        <p className="flex-1 rounded-lg border border-dashed border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
          O código gerado aparecerá aqui.
        </p>
      )}
      <UsageDialog
        open={usageOpen && !disabled}
        onOpenChange={setUsageOpen}
        code={code}
        finalFocusRef={usageBtnRef}
      />
    </section>
  );
}
