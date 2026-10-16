import { google } from "@ai-sdk/google";

// Single source of truth for the model id — swap here for a higher-headroom model or the Groq fallback.
export const MODEL_ID = "gemini-3.8-flash";

// D-02: the mock switch is an env var only (never a header/body/NEXT_PUBLIC_
// value) and is hard-disabled on Vercel Production. Read at call time.
export function isE2EMock(): boolean {
  return (
    process.env.UIFORGE_E2E_MOCK === "1" &&
    process.env.VERCEL_ENV !== "production"
  );
}

export async function getModel(prompt: string) {
  if (isE2EMock()) {
    // Dynamic import so production never loads ai/test.
    return (await import("./mock-model")).createE2EMockModel(prompt);
  }
  return google(MODEL_ID);
}
