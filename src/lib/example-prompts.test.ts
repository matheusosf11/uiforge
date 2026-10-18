/// <reference types="vitest/globals" />
import { MAX_PROMPT_LENGTH } from "./prompt-limits";
import { EXAMPLE_CATEGORIES, EXAMPLE_PROMPTS } from "./example-prompts";

describe("EXAMPLE_PROMPTS", () => {
  it("covers every gallery category with 4 examples, in category order", () => {
    expect(EXAMPLE_CATEGORIES.map((c) => c.label)).toEqual([
      "Cards",
      "Formulários",
      "Dashboards",
      "Tabelas",
      "Menus",
      "Básicos",
    ]);
    for (const c of EXAMPLE_CATEGORIES) {
      expect(EXAMPLE_PROMPTS.filter((e) => e.category === c.id)).toHaveLength(4);
    }
  });

  it("has unique ids and labels", () => {
    expect(new Set(EXAMPLE_PROMPTS.map((e) => e.id)).size).toBe(EXAMPLE_PROMPTS.length);
    expect(new Set(EXAMPLE_PROMPTS.map((e) => e.label)).size).toBe(EXAMPLE_PROMPTS.length);
  });

  it("are complete, ready-to-generate prompts that fit the field", () => {
    for (const e of EXAMPLE_PROMPTS) {
      expect(e.prompt.length).toBeGreaterThan(150);
      expect(e.prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
      expect(e.label.length).toBeLessThanOrEqual(20);
    }
  });
});
