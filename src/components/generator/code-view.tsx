"use client";

import { Highlight, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";

export function CodeView({ code }: { code: string }) {
  return (
    <section
      aria-label="Generated code"
      className="flex h-full min-h-64 flex-col rounded-xl border border-border bg-card p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        Código gerado
      </h2>
      {code ? (
        <Highlight code={code} language="tsx" theme={themes.nightOwl}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
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
