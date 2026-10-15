const DECLARED =
  /export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/;
const CLASS_NAME = /export\s+default\s+class\s+([A-Za-z_$][\w$]*)/;
// The identifier must end the statement, so `export default React.memo(Card)`
// does not become "React.tsx".
const ALIAS = /export\s+default\s+([A-Z][\w$]*)\s*(?:;|$)/m;

const FALLBACK = "Component.tsx";

/**
 * Nome do arquivo para download (D-08). Sai apenas de um identificador JS
 * mais o sufixo fixo `.tsx`, entao nunca contem "/" nem "..".
 */
export function componentFilename(code: string): string {
  const named = code.match(DECLARED)?.[1] ?? code.match(CLASS_NAME)?.[1];
  if (named) return `${named}.tsx`;
  const alias = code.match(ALIAS)?.[1];
  if (alias) return `${alias}.tsx`;
  return FALLBACK;
}
