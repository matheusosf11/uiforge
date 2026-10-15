import { APICallError } from "ai";

export const RATE_LIMIT_MESSAGE =
  "Muitas tentativas. Espere um pouco e tente de novo.";
export const GENERIC_ERROR_MESSAGE =
  "Falha ao gerar o componente. Tente novamente.";

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
export function friendlyGenerateError(error: unknown): string {
  return isRateLimitError(error) ? RATE_LIMIT_MESSAGE : GENERIC_ERROR_MESSAGE;
}
