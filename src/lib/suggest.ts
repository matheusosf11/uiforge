// Pure helpers shared by /api/suggest and the client (no server imports).

export type Suggestion = { label: string; instruction: string };

const MAX_SUGGESTIONS = 4;
const MAX_LABEL = 30;
const MAX_INSTRUCTION = 300;

export const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { label: "Modo escuro", instruction: "Adicione suporte a modo escuro com cores adequadas." },
  { label: "Mais espaçamento", instruction: "Aumente o espaçamento interno e entre os elementos." },
  { label: "Adicionar ícone", instruction: "Adicione um ícone adequado ao componente." },
  { label: "Animação no hover", instruction: "Adicione uma animação sutil ao passar o mouse." },
];

export const MOCK_SUGGESTIONS: Suggestion[] = [
  { label: "Cor mais forte", instruction: "Use uma cor de destaque mais forte e vibrante." },
  { label: "Bordas arredondadas", instruction: "Deixe as bordas mais arredondadas." },
  { label: "Sombra suave", instruction: "Adicione uma sombra suave ao componente." },
  { label: "Texto maior", instruction: "Aumente o tamanho do texto para melhorar a leitura." },
];

export function sanitizeSuggestions(input: unknown): Suggestion[] {
  if (!Array.isArray(input)) return [];
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (out.length >= MAX_SUGGESTIONS) break;
    if (!item || typeof item !== "object") continue;
    const { label, instruction } = item as Record<string, unknown>;
    if (typeof label !== "string" || typeof instruction !== "string") continue;
    const l = label.trim().slice(0, MAX_LABEL).trim();
    const i = instruction.trim().slice(0, MAX_INSTRUCTION).trim();
    if (!l || !i) continue;
    const key = l.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: l, instruction: i });
  }
  return out;
}

export function fillWithFallback(list: Suggestion[]): Suggestion[] {
  const out = list.slice(0, MAX_SUGGESTIONS);
  const seen = new Set(out.map((s) => s.label.toLowerCase()));
  for (const f of FALLBACK_SUGGESTIONS) {
    if (out.length >= MAX_SUGGESTIONS) break;
    if (seen.has(f.label.toLowerCase())) continue;
    seen.add(f.label.toLowerCase());
    out.push(f);
  }
  return out;
}
