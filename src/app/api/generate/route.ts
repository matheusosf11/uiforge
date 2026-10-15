import { streamText } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai/model";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { isRateLimitError } from "@/lib/generate-error";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby allows up to 300; prevents stream truncation (P5)

const Body = z.object({ prompt: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return new Response(
      "Invalid request: prompt must be a non-empty string of at most 2000 characters.",
      { status: 400 },
    );
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to .env.local (see .env.example).",
      { status: 500 },
    );
  }

  const result = streamText({ model, system: SYSTEM_PROMPT, prompt: parsed.prompt });

  // Peek the full stream until the first text delta so a provider failure
  // (e.g. 429) can be reported as a real HTTP status before any byte is sent.
  const reader = result.fullStream.getReader();
  const encoder = new TextEncoder();
  let firstDelta: string | null = null;

  try {
    while (firstDelta === null) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === "text-delta") {
        firstDelta = value.text;
      } else if (value.type === "error") {
        return failureResponse(value.error);
      } else if (value.type === "abort") {
        break;
      }
    }
  } catch (error) {
    return failureResponse(error);
  }

  if (firstDelta === null) {
    return new Response("generate_failed", { status: 502 });
  }

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
            void reader.cancel().catch(() => {});
            controller.error(new Error("generate_failed"));
            return;
          }
        }
      } catch {
        controller.error(new Error("generate_failed"));
      }
    },
    cancel() {
      void reader.cancel().catch(() => {});
    },
  });

  return new Response(readable, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function failureResponse(error: unknown) {
  return isRateLimitError(error)
    ? new Response("rate_limited", { status: 429 })
    : new Response("generate_failed", { status: 502 });
}
