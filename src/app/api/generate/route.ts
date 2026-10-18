import { streamText } from "ai";
import { z } from "zod";
import { getModels, isE2EMock } from "@/lib/ai/model";
import { buildSystem, buildUserPrompt, type Mode } from "@/lib/ai/prompt";
import { isRateLimitError } from "@/lib/generate-error";
import { IMAGE_MEDIA_TYPES, MAX_IMAGE_BASE64_LENGTH } from "@/lib/prompt-image";
import { MAX_CODE_LENGTH, MAX_PROMPT_LENGTH } from "@/lib/prompt-limits";
import { checkRateLimit, clientIp, getRateLimitConfig } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby allows up to 300; prevents stream truncation (P5)

// Gemini thinking tokens count toward this budget (D-10).
const MAX_OUTPUT_TOKENS = 32_768;
// Defense in depth: reject absurd bodies before parsing JSON.
// Derivation: the worst case JSON escaping costs 6 bytes per UTF-16 unit
// (control chars become \u00XX; non-BMP chars are 4 UTF-8 bytes per 2 units).
// (30_000 code + 2_000 prompt) * 6 = 192_000, plus envelope/keys, is ~193 KB.
// 256_000 leaves margin so a legitimate max-size body never trips the guard.
// An attached image adds its base64 (plain ASCII, 1 byte per char) on top.
const MAX_BODY_BYTES = 256_000 + MAX_IMAGE_BASE64_LENGTH;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Whitespace-only/null/absent currentCode means generate mode (D-08); real
// code keeps its original untrimmed text. No .max here: oversize is a 413.
const Body = z.object({
  prompt: z
    .string()
    .max(MAX_PROMPT_LENGTH)
    .refine((s) => s.trim().length > 0),
  currentCode: z
    .string()
    .nullish()
    .transform((c) => (c && c.trim() !== "" ? c : undefined)),
  // Optional visual reference, already shrunk by the browser.
  image: z
    .object({
      mediaType: z.enum(IMAGE_MEDIA_TYPES),
      data: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH).regex(BASE64),
    })
    .nullish()
    .transform((i) => i ?? undefined),
});

export async function POST(req: Request) {
  // Fast reject on a declared length; absent/invalid/lying headers are caught
  // by the byte check on the actual body below.
  const header = req.headers.get("content-length");
  const declared = header === null || header.trim() === "" ? NaN : Number(header);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new Response("code_too_large", { status: 413 });
  }
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new Response("Invalid request: unreadable body.", { status: 400 });
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return new Response("code_too_large", { status: 413 });
  }
  let parsed: z.infer<typeof Body>;
  try {
    const result = Body.safeParse(JSON.parse(raw));
    if (!result.success) throw new Error("invalid");
    parsed = result.data;
  } catch {
    return new Response(
      `Invalid request: prompt must be a non-empty string of at most ${MAX_PROMPT_LENGTH} characters; image must be PNG, JPEG or WebP base64.`,
      { status: 400 },
    );
  }
  const { prompt, currentCode, image } = parsed;
  // Before the limiter so oversize requests consume no quota (D-05, D-06, D-09).
  if (currentCode && currentCode.length > MAX_CODE_LENGTH) {
    return new Response("code_too_large", { status: 413 });
  }
  const mode: Mode = currentCode ? "edit" : "generate";
  const limit = checkRateLimit(clientIp(req), getRateLimitConfig());
  if (!limit.ok) {
    return new Response("rate_limited", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec) },
    });
  }
  if (!isE2EMock() && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to .env.local (see .env.example).",
      { status: 500 },
    );
  }

  // Try each model in order until one yields a first text delta. Failures
  // before any byte is sent (503 "high demand", per-model 429 quota, empty
  // stream) fall through to the next model; the last failure is reported.
  const encoder = new TextEncoder();
  let opened: Opened | null = null;
  let lastFailure: Response = new Response("generate_failed", { status: 502 });
  for (const model of await getModels(prompt, currentCode)) {
    if (req.signal.aborted) break;
    const attempt = await openStream(
      model,
      mode,
      prompt,
      currentCode,
      image,
      req.signal,
    );
    if ("failure" in attempt) {
      lastFailure = attempt.failure;
      continue;
    }
    opened = attempt;
    break;
  }
  if (!opened) return lastFailure;

  const { reader, firstDelta, modelId } = opened;
  const cancelReader = () => void reader.cancel().catch(() => {});
  const first = firstDelta;

  // Plain text stream protocol (not the UI-message protocol).
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first));
    },
    async pull(controller) {
      // Per the WHATWG Streams spec, pull() is not called again if it resolves
      // without enqueue/close. Keep reading until a text delta is enqueued or
      // the stream ends; skip non-text parts (text-start/text-end/start-step/
      // finish-step/finish/reasoning/...), otherwise the response never closes.
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          if (value.type === "text-delta") {
            controller.enqueue(encoder.encode(value.text));
            return;
          }
          if (value.type === "finish") {
            // Privacy: only mode, model id and token counts (D-11).
            const u = (value as { totalUsage?: { inputTokens?: number; outputTokens?: number } }).totalUsage;
            const finishReason = (value as { finishReason?: unknown }).finishReason;
            console.info(
              JSON.stringify({
                evt: "generate_usage",
                mode,
                model: modelId,
                finishReason: typeof finishReason === "string" ? finishReason : null,
                inputTokens: u?.inputTokens ?? null,
                outputTokens: u?.outputTokens ?? null,
              }),
            );
            // A non-"stop" finish (length, content-filter/recitation, other)
            // means the model cut the file short: fail the body like a
            // mid-stream error instead of presenting truncated code as done.
            if (typeof finishReason === "string" && finishReason !== "stop") {
              cancelReader();
              controller.error(new Error("generate_failed"));
              return;
            }
            continue;
          }
          if (value.type === "error" || value.type === "abort") {
            // Status 200 is already sent: error the body so the client's
            // stream read rejects (onError -> friendly alert + retry) instead
            // of presenting truncated code as a successful "Pronto".
            cancelReader();
            controller.error(new Error("generate_failed"));
            return;
          }
        }
      } catch {
        controller.error(new Error("generate_failed"));
      }
    },
    cancel() {
      cancelReader();
    },
  });

  return new Response(readable, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

type Model = Awaited<ReturnType<typeof getModels>>[number];
type FullStreamReader = ReadableStreamDefaultReader<
  ReturnType<typeof streamText>["fullStream"] extends ReadableStream<infer P>
    ? P
    : never
>;
type Opened = { reader: FullStreamReader; firstDelta: string; modelId: string };
type Image = NonNullable<z.infer<typeof Body>["image"]>;

// Peek one model's full stream until the first text delta so a provider
// failure (e.g. 429/503) can be reported as a real HTTP status — or trigger
// the next fallback model — before any byte is sent.
async function openStream(
  model: Model,
  mode: Mode,
  prompt: string,
  currentCode: string | undefined,
  image: Image | undefined,
  abortSignal: AbortSignal,
): Promise<Opened | { failure: Response }> {
  const text = buildUserPrompt(prompt, currentCode);
  const result = streamText({
    model,
    system: buildSystem(mode, { image: !!image }),
    ...(image
      ? {
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text },
                {
                  type: "file" as const,
                  mediaType: image.mediaType,
                  data: { type: "data" as const, data: image.data },
                },
              ],
            },
          ],
        }
      : { prompt: text }),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // Client disconnect/"Parar" cancels the provider request (and quota use).
    abortSignal,
    // One SDK retry per model keeps the whole chain under maxDuration; the
    // fallback chain is the main resilience mechanism.
    maxRetries: 1,
  });

  const reader = result.fullStream.getReader();
  // Failure paths never hand the reader to a response body, so cancel it
  // explicitly to stop consuming the provider stream.
  const fail = (failure: Response) => {
    void reader.cancel().catch(() => {});
    return { failure };
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === "text-delta") {
        return {
          reader,
          firstDelta: value.text,
          modelId: (model as { modelId?: string }).modelId ?? "unknown",
        };
      }
      if (value.type === "error") return fail(failureResponse(value.error));
      if (value.type === "abort") break;
    }
  } catch (error) {
    return fail(failureResponse(error));
  }
  return fail(new Response("generate_failed", { status: 502 }));
}

function failureResponse(error: unknown) {
  return isRateLimitError(error)
    ? new Response("rate_limited", { status: 429 })
    : new Response("generate_failed", { status: 502 });
}
