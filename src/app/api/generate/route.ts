import { streamText } from "ai";
import { z } from "zod";
import { getModels, isE2EMock } from "@/lib/ai/model";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { isRateLimitError } from "@/lib/generate-error";
import { MAX_PROMPT_LENGTH } from "@/lib/prompt-limits";
import { checkRateLimit, clientIp, getRateLimitConfig } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby allows up to 300; prevents stream truncation (P5)

const Body = z.object({ prompt: z.string().min(1).max(MAX_PROMPT_LENGTH) });

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return new Response(
      `Invalid request: prompt must be a non-empty string of at most ${MAX_PROMPT_LENGTH} characters.`,
      { status: 400 },
    );
  }
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
  for (const model of await getModels(parsed.prompt)) {
    if (req.signal.aborted) break;
    const attempt = await openStream(model, parsed.prompt, req.signal);
    if ("failure" in attempt) {
      lastFailure = attempt.failure;
      continue;
    }
    opened = attempt;
    break;
  }
  if (!opened) return lastFailure;

  const { reader, firstDelta } = opened;
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
type Opened = { reader: FullStreamReader; firstDelta: string };

// Peek one model's full stream until the first text delta so a provider
// failure (e.g. 429/503) can be reported as a real HTTP status — or trigger
// the next fallback model — before any byte is sent.
async function openStream(
  model: Model,
  prompt: string,
  abortSignal: AbortSignal,
): Promise<Opened | { failure: Response }> {
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    prompt,
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
        return { reader, firstDelta: value.text };
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
