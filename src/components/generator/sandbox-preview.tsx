"use client";

import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { buildSandpackFiles } from "@/lib/sandpack-files";

export function SandboxPreview({ code }: { code: string }) {
  return (
    <section
      aria-label="Live preview"
      className="flex min-h-64 flex-col rounded-xl border border-border bg-card p-4"
    >
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">
        Preview
      </h2>
      <SandpackProvider
        key={code}
        template="react-ts"
        theme="dark"
        files={buildSandpackFiles(code)}
        options={{
          autorun: true,
          initMode: "immediate",
          recompileMode: "delayed",
        }}
      >
        <SandpackLayout className="min-h-64 flex-1">
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showNavigator={false}
          />
        </SandpackLayout>
      </SandpackProvider>
    </section>
  );
}
