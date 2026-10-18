// Visual editing without prompts: pure rewrites of the Tailwind classes in a
// generated component. Every edit is computed from the same base code, so
// moving a control back to "original" gives the original code back.

export const ACCENT_FAMILIES = [
  "indigo",
  "blue",
  "sky",
  "cyan",
  "teal",
  "emerald",
  "green",
  "lime",
  "amber",
  "orange",
  "red",
  "rose",
  "pink",
  "fuchsia",
  "violet",
  "purple",
] as const;
export const NEUTRAL_FAMILIES = ["slate", "gray", "zinc", "neutral", "stone"] as const;
export type AccentFamily = (typeof ACCENT_FAMILIES)[number];
export type NeutralFamily = (typeof NEUTRAL_FAMILIES)[number];

/** Swatch colors (Tailwind 500/600 shades) for the pickers. */
export const FAMILY_HEX: Record<AccentFamily | NeutralFamily, string> = {
  indigo: "#4f46e5",
  blue: "#2563eb",
  sky: "#0284c7",
  cyan: "#0891b2",
  teal: "#0d9488",
  emerald: "#059669",
  green: "#16a34a",
  lime: "#65a30d",
  amber: "#d97706",
  orange: "#ea580c",
  red: "#dc2626",
  rose: "#e11d48",
  pink: "#db2777",
  fuchsia: "#c026d3",
  violet: "#7c3aed",
  purple: "#9333ea",
  slate: "#475569",
  gray: "#4b5563",
  zinc: "#52525b",
  neutral: "#525252",
  stone: "#57534e",
};

export const FAMILY_LABEL: Record<AccentFamily | NeutralFamily, string> = {
  indigo: "Índigo",
  blue: "Azul",
  sky: "Céu",
  cyan: "Ciano",
  teal: "Turquesa",
  emerald: "Esmeralda",
  green: "Verde",
  lime: "Lima",
  amber: "Âmbar",
  orange: "Laranja",
  red: "Vermelho",
  rose: "Rosa",
  pink: "Pink",
  fuchsia: "Fúcsia",
  violet: "Violeta",
  purple: "Roxo",
  slate: "Ardósia",
  gray: "Cinza",
  zinc: "Zinco",
  neutral: "Neutro",
  stone: "Pedra",
};

export type VisualSettings = {
  accent: AccentFamily | null;
  neutral: NeutralFamily | null;
  /** Steps on the radius scale (negative = squarer). */
  radius: number;
  /** Steps on the spacing scale for padding, margin and gaps. */
  spacing: number;
  /** Steps on the font-size scale. */
  text: number;
  border: "original" | "none" | "thick";
  font: "original" | "sans" | "serif" | "mono";
};

export const ORIGINAL_SETTINGS: VisualSettings = {
  accent: null,
  neutral: null,
  radius: 0,
  spacing: 0,
  text: 0,
  border: "original",
  font: "original",
};

const COLOR_UTILITIES =
  "bg|text|border|border-[xytrblse]|ring|ring-offset|outline|from|via|to|fill|stroke|decoration|accent|caret|shadow|divide|placeholder";
const SHADE = "50|[1-9]00|950";

function colorPattern(families: readonly string[]): RegExp {
  return new RegExp(
    `(?<![\\w-])((?:${COLOR_UTILITIES})-)(${families.join("|")})-(${SHADE})(?![\\w-])`,
    "g",
  );
}

const ACCENT_RE = colorPattern(ACCENT_FAMILIES);
const NEUTRAL_RE = colorPattern(NEUTRAL_FAMILIES);

function mostUsed(code: string, re: RegExp): string | null {
  const counts = new Map<string, number>();
  for (const m of code.matchAll(re)) counts.set(m[2], (counts.get(m[2]) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [family, count] of counts) {
    if (count > bestCount) {
      best = family;
      bestCount = count;
    }
  }
  return best;
}

/** The accent color family used most in the classes, if any. */
export function detectAccent(code: string): AccentFamily | null {
  return mostUsed(code, ACCENT_RE) as AccentFamily | null;
}

export function detectNeutral(code: string): NeutralFamily | null {
  return mostUsed(code, NEUTRAL_RE) as NeutralFamily | null;
}

/** Replaces one color family by another in every color utility. */
export function replaceFamily(code: string, from: string, to: string): string {
  if (from === to) return code;
  return code.replace(
    new RegExp(
      `(?<![\\w-])((?:${COLOR_UTILITIES})-)${from}-(${SHADE})(?![\\w-])`,
      "g",
    ),
    (_m, prefix: string, shade: string) => `${prefix}${to}-${shade}`,
  );
}

const RADIUS_SCALE = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
const RADIUS_RE =
  /(?<![\w-])rounded(-(?:tl|tr|bl|br|ss|se|es|ee|t|r|b|l|s|e))?(?:-(none|xs|sm|md|lg|xl|2xl|3xl))?(?![\w-])/g;

/** Moves every rounded-* (except rounded-full) `steps` along the scale. */
export function shiftRadius(code: string, steps: number): string {
  if (steps === 0) return code;
  return code.replace(RADIUS_RE, (_m, side: string | undefined, size: string | undefined) => {
    // Bare `rounded` is 0.25rem, the same as rounded-sm.
    const from = RADIUS_SCALE.indexOf(size ?? "sm");
    const to = RADIUS_SCALE[Math.max(0, Math.min(RADIUS_SCALE.length - 1, from + steps))];
    return `rounded${side ?? ""}-${to}`;
  });
}

const SPACING_SCALE = [
  "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44", "48",
];
const SPACING_RE =
  /(?<![\w-])(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.5)?)(?![\w.])/g;

/** Moves padding, margin, gap and space-* values `steps` along the scale. */
export function shiftSpacing(code: string, steps: number): string {
  if (steps === 0) return code;
  return code.replace(SPACING_RE, (m, utility: string, value: string) => {
    const from = SPACING_SCALE.indexOf(value);
    if (from === -1) return m;
    const to = Math.max(0, Math.min(SPACING_SCALE.length - 1, from + steps));
    return `${utility}-${SPACING_SCALE[to]}`;
  });
}

const TEXT_SCALE = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"];
const TEXT_RE = /(?<![\w-])text-(xs|sm|base|lg|xl|[2-7]xl)(?![\w-])/g;

/** Moves every text-size utility `steps` along the scale. */
export function shiftText(code: string, steps: number): string {
  if (steps === 0) return code;
  return code.replace(TEXT_RE, (_m, size: string) => {
    const from = TEXT_SCALE.indexOf(size);
    const to = Math.max(0, Math.min(TEXT_SCALE.length - 1, from + steps));
    return `text-${TEXT_SCALE[to]}`;
  });
}

const BORDER_RE = /(?<![\w-])border(-[xytrblse])?(?:-(0|2|4|8))?(?![\w-])/g;

/** Removes the borders (border-0) or makes them thicker (border-2). */
export function setBorders(code: string, mode: VisualSettings["border"]): string {
  if (mode === "original") return code;
  return code.replace(BORDER_RE, (m, side: string | undefined, width: string | undefined) => {
    if (width === "0") return m;
    return mode === "none" ? `border${side ?? ""}-0` : `border${side ?? ""}-2`;
  });
}

const FONT_RE = /(?<![\w-])font-(sans|serif|mono)(?![\w-])\s?/g;

/**
 * Sets the font family on the outermost element: removes font-sans/serif/mono
 * everywhere and adds the choice to the first className="..." after the
 * default export (the root of the returned JSX).
 */
export function setFont(code: string, font: VisualSettings["font"]): string {
  if (font === "original") return code;
  const stripped = code.replace(FONT_RE, "").replace(/className="\s+/g, 'className="');
  const start = Math.max(0, stripped.search(/export\s+default/));
  const at = stripped.indexOf('className="', start);
  if (at === -1) return stripped;
  const insert = at + 'className="'.length;
  return `${stripped.slice(0, insert)}font-${font} ${stripped.slice(insert)}`;
}

/** Applies every visual setting to the base code, in a fixed order. */
export function applyVisual(code: string, s: VisualSettings): string {
  let next = code;
  const accent = detectAccent(code);
  if (s.accent && accent) next = replaceFamily(next, accent, s.accent);
  const neutral = detectNeutral(code);
  if (s.neutral && neutral) next = replaceFamily(next, neutral, s.neutral);
  next = shiftRadius(next, s.radius);
  next = shiftSpacing(next, s.spacing);
  next = shiftText(next, s.text);
  next = setBorders(next, s.border);
  next = setFont(next, s.font);
  return next;
}
