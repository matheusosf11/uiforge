"use client";

import { useErrorMessage } from "@codesandbox/sandpack-react";

export function PreviewErrorBanner() {
  const message = useErrorMessage();
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
