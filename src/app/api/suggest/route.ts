import { generateText, Output } from "ai";
import { z } from "zod";
import { getSuggestModels, isE2EMock } from "@/lib/ai/model";
import { buildSuggestSystem, buildSuggestUser } from "@/lib/ai/suggest-prompt";
import { MAX_CODE_LENGTH } from "@/lib/prompt-limits";
import { clientIp, getSuggestRateLimitConfig, limitRequest } from "@/lib/rate-limit";
import { isForeignOrigin, isJsonRequest } from "@/lib/request-guard";
import { cacheKey, cachedSuggestions, rememberSuggestions } from "@/lib/suggest-cache";
import {
  MOCK_SUGGESTIONS,
  sanitizeSuggestions,
  SUGGEST_MODEL_TIMEOUT_MS,
  SUGGEST_SERVER_BUDGET_MS,
} from "@/lib/suggest";

export const runtime = "nodejs";
export const maxDuration = 30;

// Thinking tokens count toward this budget.
const MAX_OUTPUT_TOKENS = 2048;
// Below this remaining budget, a model call is not worth starting.
const MIN_MODEL_TIMEOUT_MS = 1000;
// Same derivation as /api/generate: worst-case JSON escaping is 6 bytes per
// UTF-16 unit; 30_000 code * 6 = 180_000 plus envelope, so 256_000 leaves margin.
const MAX_BODY_BYTES = 256_000;

const Body = z.object({
  code: z.string().refine((s) => s.trim().length > 0),
});

// Lenient: the server sanitizes and clamps afterwards.
const Schema = z.object({
  suggestions: z
    .array(z.object({ label: z.string(), instruction: z.string() }))
    .min(1)
    .max(8),
});

export async function POST(req: Request) {
  if (isForeignOrigin(req)) {
    return new Response("forbidden", { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return new Response("Invalid request: expected application/json.", {
      status: 415,
    });
  }
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
  let code: string;
  try {
    const result = Body.safeParse(JSON.parse(raw));
    if (!result.success) throw new Error("invalid");
    code = result.data.code;
  } catch {
    return new Response("Invalid request: code must be a non-empty string.", {
      status: 400,
    });
  }
  // Before the limiter so oversize requests consume no quota.
  if (code.length > MAX_CODE_LENGTH) {
    return new Response("code_too_large", { status: 413 });
  }
  const key = cacheKey(code);
  const cached = isE2EMock() ? undefined : cachedSuggestions(key);
  if (cached) return Response.json({ suggestions: cached });
  const limit = await limitRequest(`suggest:${clientIp(req)}`, [
    { scope: "minute", config: getSuggestRateLimitConfig() },
  ]);
  if (!limit.ok) {
    return new Response("rate_limited", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec) },
    });
  }

  if (isE2EMock()) {
    if (code.includes("__suggest_fail__")) {
      return new Response("suggest_failed", { status: 502 });
    }
    return Response.json({ suggestions: MOCK_SUGGESTIONS });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to .env.local (see .env.example).",
      { status: 500 },
    );
  }

  // Total deadline for the whole chain (see SUGGEST_SERVER_BUDGET_MS): the
  // client gives up after SUGGEST_CLIENT_TIMEOUT_MS, which is longer.
  const deadline = Date.now() + SUGGEST_SERVER_BUDGET_MS;
  for (const model of getSuggestModels()) {
    if (req.signal.aborted) break;
    const remaining = deadline - Date.now();
    if (remaining < MIN_MODEL_TIMEOUT_MS) break;
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: Schema }),
        system: buildSuggestSystem(),
        prompt: buildSuggestUser(code),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        timeout: Math.min(SUGGEST_MODEL_TIMEOUT_MS, remaining),
        maxRetries: 0,
        abortSignal: req.signal,
      });
      const suggestions = sanitizeSuggestions(result.output?.suggestions);
      if (suggestions.length === 0) continue;
      // Privacy: evt, model id and count only; never the code or prompt.
      console.info(
        JSON.stringify({
          evt: "suggest_usage",
          model: (model as { modelId?: string }).modelId ?? "unknown",
          count: suggestions.length,
        }),
      );
      rememberSuggestions(key, suggestions);
      return Response.json({ suggestions });
    } catch {
      // Try the next model; provider messages are never exposed.
    }
  }
  return new Response("suggest_failed", { status: 502 });
}
