import { streamText } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai/model";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";

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
  // Plain text stream protocol (not the UI-message protocol).
  return result.toTextStreamResponse();
}
