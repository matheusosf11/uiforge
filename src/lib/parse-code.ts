const BARE_CODE_START =
  /^(?:['"]use (?:client|server)['"];?\s*)?(?:import\s|export\s|function\s|const\s|let\s|var\s|type\s|interface\s|class\s|\/\*|\/\/)/;

/**
 * Streaming-safe extractor for LLM code output.
 * Unwraps a markdown fence only when the model wrapped the answer.
 * Bare TSX that happens to contain ``` (e.g. a markdown editor) is left intact.
 * Never throws on partial / mid-stream input.
 */
export function parseCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (BARE_CODE_START.test(trimmed) && !trimmed.startsWith("```")) {
    return trimmed;
  }

  const match = raw.match(/```(?:[a-zA-Z]+)?\s*\n?([\s\S]*?)(?:```|$)/);
  return (match?.[1] ?? raw).trim();
}
