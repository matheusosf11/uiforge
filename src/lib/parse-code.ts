/**
 * Streaming-safe extractor for LLM code output.
 * Strips markdown fences and surrounding prose; never throws on partial input.
 */
export function parseCode(raw: string): string {
  const match = raw.match(/```(?:[a-zA-Z]+)?\s*\n?([\s\S]*?)(?:```|$)/);
  const body = match?.[1] ?? raw;
  return body.trim();
}
