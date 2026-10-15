import { google } from "@ai-sdk/google";

// Single source of truth for the model id — swap here for a higher-headroom model or the Groq fallback.
export const MODEL_ID = "gemini-2.5-flash";
export const model = google(MODEL_ID);
