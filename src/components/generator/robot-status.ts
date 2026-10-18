// Maps the generator's visible status to the robot's mood and speech bubble.
// The robot reads the page (status region + alerts) instead of the session,
// so it stays a decoupled, decorative layer.

export type RobotMood = "idle" | "working" | "done" | "error" | "nav";

export type RobotReading = { mood: RobotMood; say: string | null };

export function readRobotStatus(
  status: string,
  hasAlert: boolean,
): RobotReading {
  const text = status.trim();
  if (/Refinando…/.test(text)) {
    return { mood: "working", say: "Aplicando sua mudança…" };
  }
  if (/Gerando…/.test(text)) {
    return { mood: "working", say: "Gerando seu componente…" };
  }
  if (hasAlert) {
    return { mood: "error", say: "Ops, algo deu errado. Tente de novo." };
  }
  const ready = /Pronto — (v\d+)/.exec(text);
  if (ready) return { mood: "done", say: `Pronto! Esta é a ${ready[1]}.` };
  const nav = /(Voltou para|Foi para) (v\d+)/.exec(text);
  if (nav) return { mood: "nav", say: `${nav[1]} ${nav[2]}.` };
  if (/Edição salva como v\d+/.test(text)) {
    return { mood: "nav", say: text.split(" · ")[0] + "." };
  }
  return { mood: "idle", say: null };
}

export const ROBOT_TIPS = [
  "Clique em mim para eu sugerir um prompt.",
  "Dica: Ctrl/⌘+Enter envia o prompt.",
  "Dica: clique numa versão do histórico para voltar a ela.",
  "Dica: você pode editar o código direto no painel.",
  "Dica: Ctrl/⌘+Z fora do campo desfaz a última versão.",
] as const;

/** Picks a random item, avoiding an immediate repeat of `previous`. */
export function pickRandom<T>(
  items: readonly T[],
  previous: T | null,
  random: () => number = Math.random,
): T {
  if (items.length <= 1) return items[0];
  let next = items[Math.floor(random() * items.length)];
  if (next === previous) {
    next = items[(items.indexOf(next) + 1) % items.length];
  }
  return next;
}
