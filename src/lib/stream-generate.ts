import type { PromptImage } from "@/lib/prompt-image";

export type StreamResult =
  | { ok: true; text: string }
  | { ok: false; reason: "aborted" }
  | { ok: false; reason: "http"; status: number; body: string }
  | { ok: false; reason: "stream"; error: unknown };

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "AbortError"
  );
}

export async function streamGenerate(
  body: { prompt: string; currentCode?: string; images?: readonly PromptImage[] },
  opts: {
    signal: AbortSignal;
    onText: (fullText: string) => void;
    fetchImpl?: typeof fetch;
  },
): Promise<StreamResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const payload: {
    prompt: string;
    currentCode?: string;
    images?: { mediaType: string; data: string }[];
  } = {
    prompt: body.prompt,
  };
  if (body.currentCode !== undefined) payload.currentCode = body.currentCode;
  // The file name stays in the browser.
  if (body.images && body.images.length > 0) {
    payload.images = body.images.map((i) => ({
      mediaType: i.mediaType,
      data: i.data,
    }));
  }

  try {
    const res = await doFetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: opts.signal,
    });

    if (!res.ok) {
      let text = "";
      try {
        text = await res.text();
      } catch {
        // body unreadable; status is what matters
      }
      return { ok: false, reason: "http", status: res.status, body: text };
    }

    if (!res.body) {
      return { ok: false, reason: "stream", error: new Error("empty body") };
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += value;
      opts.onText(full);
    }

    if (opts.signal.aborted) return { ok: false, reason: "aborted" };
    return { ok: true, text: full };
  } catch (error) {
    if (isAbortError(error) || opts.signal.aborted) {
      return { ok: false, reason: "aborted" };
    }
    return { ok: false, reason: "stream", error };
  }
}
