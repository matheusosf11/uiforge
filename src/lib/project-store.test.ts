/// <reference types="vitest/globals" />
import {
  loadProjects,
  MAX_PROJECTS,
  PROJECTS_KEY,
  projectTitle,
  removeProject,
  upsertProject,
  writeProjects,
} from "./project-store";
import type { Version } from "./session";

const v = (id: number, instruction = `passo ${id}`): Version => ({
  id,
  code: `export default function C${id}() { return null; }`,
  instruction,
  source: "ai",
});

function memory(limit = Infinity) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, value: string) => {
      if (value.length > limit) throw new DOMException("full", "QuotaExceededError");
      data.set(k, value);
    },
  };
}

const snap = (versions: Version[]) => ({
  versions,
  cursor: versions.length - 1,
  droppedCount: 0,
  nextVersionId: versions.length + 1,
});

describe("projectTitle", () => {
  it("uses the first instruction on one line, shortened", () => {
    expect(projectTitle([v(1, "  card de\nproduto  ")])).toBe("card de produto");
    expect(projectTitle([v(1, "x".repeat(80))])).toHaveLength(60);
    expect(projectTitle([{ ...v(1), instruction: "", source: "manual" }])).toBe(
      "Componente sem título",
    );
  });
});

describe("project store", () => {
  it("round-trips projects and the current id, newest first", () => {
    const storage = memory();
    let store = upsertProject({ currentId: null, projects: [] }, "a", snap([v(1)]), 1);
    store = upsertProject(store, "b", snap([v(1), v(2)]), 2);
    writeProjects(store, storage);
    const loaded = loadProjects(storage);
    expect(loaded.currentId).toBe("b");
    expect(loaded.projects.map((p) => p.id)).toEqual(["b", "a"]);
    expect(loaded.projects[0]).toMatchObject({ cursor: 1, nextVersionId: 3, title: "passo 1" });
  });

  it("keeps createdAt when a project is saved again", () => {
    let store = upsertProject({ currentId: null, projects: [] }, "a", snap([v(1)]), 10);
    store = upsertProject(store, "a", snap([v(1), v(2)]), 20);
    expect(store.projects).toHaveLength(1);
    expect(store.projects[0]).toMatchObject({ createdAt: 10, updatedAt: 20 });
  });

  it("ignores broken or foreign data instead of crashing", () => {
    const storage = memory();
    storage.data.set(PROJECTS_KEY, "{not json");
    expect(loadProjects(storage)).toEqual({ currentId: null, projects: [] });
    storage.data.set(
      PROJECTS_KEY,
      JSON.stringify({
        currentId: "gone",
        projects: [
          { id: "ok", versions: [v(1)], cursor: 0, updatedAt: 1 },
          { id: "bad-cursor", versions: [v(1)], cursor: 5 },
          { id: "bad-version", versions: [{ id: "x" }], cursor: 0 },
          { id: "empty", versions: [], cursor: 0 },
        ],
      }),
    );
    const loaded = loadProjects(storage);
    expect(loaded.projects.map((p) => p.id)).toEqual(["ok"]);
    expect(loaded.currentId).toBeNull();
    expect(loaded.projects[0].nextVersionId).toBe(2);
    expect(loadProjects(null)).toEqual({ currentId: null, projects: [] });
  });

  it("keeps at most MAX_PROJECTS", () => {
    let store = { currentId: null as string | null, projects: [] as ReturnType<typeof loadProjects>["projects"] };
    for (let i = 0; i < MAX_PROJECTS + 5; i++) {
      store = upsertProject(store, `p${i}`, snap([v(1)]), i);
    }
    const storage = memory();
    expect(writeProjects(store, storage)?.projects).toHaveLength(MAX_PROJECTS);
    expect(loadProjects(storage).projects[0].id).toBe(`p${MAX_PROJECTS + 4}`);
  });

  it("drops the oldest projects, never the current one, when storage is full", () => {
    let store = upsertProject({ currentId: null, projects: [] }, "old", snap([v(1)]), 1);
    store = upsertProject(store, "mid", snap([v(1)]), 2);
    store = upsertProject(store, "cur", snap([v(1)]), 3);
    // Room for about two projects.
    const one = JSON.stringify({ currentId: "cur", projects: [store.projects[0]] }).length;
    const storage = memory(one * 2);
    const written = writeProjects(store, storage);
    expect(written?.projects.map((p) => p.id)).toEqual(["cur", "mid"]);
    // Not even the current one fits: nothing is written.
    expect(writeProjects(store, memory(10))).toBeNull();
  });

  it("removes a project and forgets it as current", () => {
    const store = upsertProject({ currentId: null, projects: [] }, "a", snap([v(1)]));
    expect(removeProject(store, "a")).toEqual({ currentId: null, projects: [] });
  });
});
