import { APICallError } from "ai";

export const RATE_LIMIT_MESSAGE =
  "Muitas tentativas. Espere um pouco e tente de novo.";
export const GENERIC_ERROR_MESSAGE =
  "Falha ao gerar o componente. Tente novamente.";
export const CODE_TOO_LARGE_MESSAGE =
  "O componente ficou grande demais para refinar. Comece um Novo componente.";
export const REFINE_ERROR_MESSAGE =
  "Falha ao refinar o componente. Sua versão anterior foi mantida.";

const RATE_LIMIT_PATTERN = /\b429\b|RESOURCE_EXHAUSTED|rate limit|quota/i;

/** True when the error represents a provider rate limit / quota failure. */
export function isRateLimitError(error: unknown): boolean {
  if (APICallError.isInstance(error) && error.statusCode === 429) return true;
  if (error instanceof Error) {
    if (error.message === "rate_limited") return true;
    return RATE_LIMIT_PATTERN.test(error.message);
  }
  return false;
}

/** Maps any error to one of two fixed pt-BR phrases (never the raw message). */
export function friendlyGenerateError(
  error: unknown,
  mode: "generate" | "edit" = "generate",
): string {
  if (isRateLimitError(error)) return RATE_LIMIT_MESSAGE;
  return mode === "edit" ? REFINE_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE;
}
