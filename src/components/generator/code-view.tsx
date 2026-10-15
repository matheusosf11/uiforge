"use client";

import { useEffect, useRef, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy, Download } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { componentFilename } from "@/lib/download-filename";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

export function CodeView({
  code,
  busy = false,
}: {
  code: string;
  busy?: boolean;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const prismTheme =
    mounted && resolvedTheme === "light" ? themes.nightOwlLight : themes.nightOwl;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const disabled = busy || !code.trim();

  async function handleCopy() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      timeoutRef.current = window.setTimeout(() => {
        setCopyState("idle");
        timeoutRef.current = null;
      }, 2000);
    } catch {
      const pre = preRef.current;
      const selection = window.getSelection();
      if (pre && selection) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setCopyState("failed");
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

  return (
    <section
      aria-label="Generated code"
      className="flex h-full min-h-64 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Código gerado
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
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
            className="text-xs"
            disabled={disabled}
            onClick={handleDownload}
          >
            <Download />
            Baixar
          </Button>
        </div>
      </div>
      {code ? (
        <Highlight code={code} language="tsx" theme={prismTheme}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              ref={preRef}
              className={cn(
                className,
                "max-h-[70vh] flex-1 overflow-auto rounded-lg p-3 font-mono text-xs leading-relaxed",
              )}
              style={style}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      ) : (
        <p className="flex-1 rounded-lg border border-dashed border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
          O código gerado aparecerá aqui.
        </p>
      )}
    </section>
  );
}
