import { google } from "@ai-sdk/google";

// Ordered fallback chain: if a model fails before its first token (e.g. 503
// "high demand" or a per-model 429 quota), the route tries the next one.
export const MODEL_IDS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;
export const MODEL_ID = MODEL_IDS[0];

// D-02: the mock switch is an env var only (never a header/body/NEXT_PUBLIC_
// value) and is hard-disabled on Vercel Production. Read at call time.
export function isE2EMock(): boolean {
  return (
    process.env.UIFORGE_E2E_MOCK === "1" &&
    process.env.VERCEL_ENV !== "production"
  );
}

export async function getModels(prompt: string) {
  if (isE2EMock()) {
    // Dynamic import so production never loads ai/test.
    return [(await import("./mock-model")).createE2EMockModel(prompt)];
  }
  return MODEL_IDS.map((id) => google(id));
}
