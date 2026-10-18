// Projects saved in this browser (localStorage), so versions survive a reload
// without an account. Nothing here leaves the browser. Every read is
// validated, and every storage access may throw (private mode, blocked
// storage, quota), so callers always get a usable value back.
import type { Version } from "@/lib/session";

export const PROJECTS_KEY = "uiforge:projects:v1";
export const MAX_PROJECTS = 20;
const MAX_TITLE = 60;

export type ProjectSnapshot = {
  versions: Version[];
  cursor: number;
  droppedCount: number;
  nextVersionId: number;
};

export type SavedProject = ProjectSnapshot & {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type ProjectStore = { currentId: string | null; projects: SavedProject[] };

const EMPTY: ProjectStore = { currentId: null, projects: [] };

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function newProjectId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** First instruction of the project, shortened; or a neutral fallback. */
export function projectTitle(versions: readonly Version[]): string {
  const first = versions.find((v) => v.instruction.trim())?.instruction.trim();
  if (!first) return "Componente sem título";
  const oneLine = first.replace(/\s+/g, " ");
  return oneLine.length > MAX_TITLE
    ? `${oneLine.slice(0, MAX_TITLE - 1).trimEnd()}…`
    : oneLine;
}

function isVersion(v: unknown): v is Version {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Number.isInteger(o.id) &&
    typeof o.code === "string" &&
    typeof o.instruction === "string" &&
    (o.source === "ai" || o.source === "manual")
  );
}

function toProject(p: unknown): SavedProject | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  if (!Array.isArray(o.versions) || !o.versions.every(isVersion)) return null;
  const versions = o.versions as Version[];
  if (versions.length === 0) return null;
  const cursor = Number(o.cursor);
  if (!Number.isInteger(cursor) || cursor < 0 || cursor >= versions.length) {
    return null;
  }
  const maxId = Math.max(...versions.map((v) => v.id));
  const nextVersionId = Math.max(Number(o.nextVersionId) || 0, maxId + 1);
  const droppedCount = Math.max(0, Math.floor(Number(o.droppedCount) || 0));
  const updatedAt = Number(o.updatedAt) || 0;
  return {
    id: o.id,
    title: typeof o.title === "string" && o.title ? o.title : projectTitle(versions),
    createdAt: Number(o.createdAt) || updatedAt,
    updatedAt,
    versions,
    cursor,
    droppedCount,
    nextVersionId,
  };
}

export function loadProjects(storage: Storage | null = browserStorage()): ProjectStore {
  if (!storage) return EMPTY;
  try {
    const raw = storage.getItem(PROJECTS_KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as { currentId?: unknown; projects?: unknown };
    const projects = Array.isArray(data?.projects)
      ? data.projects.map(toProject).filter((p): p is SavedProject => p !== null)
      : [];
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    const currentId =
      typeof data?.currentId === "string" &&
      projects.some((p) => p.id === data.currentId)
        ? data.currentId
        : null;
    return { currentId, projects: projects.slice(0, MAX_PROJECTS) };
  } catch {
    return EMPTY;
  }
}

/**
 * Writes the store. When the browser is out of space, the oldest projects
 * (never the current one) are dropped until it fits. Returns what was kept,
 * or null when nothing could be written.
 */
export function writeProjects(
  store: ProjectStore,
  storage: Storage | null = browserStorage(),
): ProjectStore | null {
  if (!storage) return null;
  let projects = [...store.projects]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROJECTS);
  for (;;) {
    const next = { currentId: store.currentId, projects };
    try {
      storage.setItem(PROJECTS_KEY, JSON.stringify(next));
      return next;
    } catch {
      // Sorted newest first, so the last non-current one is the oldest.
      const oldest = [...projects].reverse().find((p) => p.id !== store.currentId);
      if (!oldest) return null;
      projects = projects.filter((p) => p !== oldest);
    }
  }
}

/** Inserts or replaces a project and makes it the current one. */
export function upsertProject(
  store: ProjectStore,
  id: string,
  snapshot: ProjectSnapshot,
  now = Date.now(),
): ProjectStore {
  const existing = store.projects.find((p) => p.id === id);
  const project: SavedProject = {
    ...snapshot,
    id,
    title: projectTitle(snapshot.versions),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  return {
    currentId: id,
    projects: [project, ...store.projects.filter((p) => p.id !== id)],
  };
}

export function removeProject(store: ProjectStore, id: string): ProjectStore {
  return {
    currentId: store.currentId === id ? null : store.currentId,
    projects: store.projects.filter((p) => p.id !== id),
  };
}
