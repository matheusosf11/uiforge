/// <reference types="vitest/globals" />
import {
  FALLBACK_SUGGESTIONS,
  fillWithFallback,
  MOCK_SUGGESTIONS,
  sanitizeSuggestions,
} from "./suggest";

describe("sanitizeSuggestions", () => {
  it("returns [] for non-array input", () => {
    expect(sanitizeSuggestions(null)).toEqual([]);
    expect(sanitizeSuggestions("x")).toEqual([]);
    expect(sanitizeSuggestions({})).toEqual([]);
  });

  it("clamps label to 30 and instruction to 300", () => {
    const [s] = sanitizeSuggestions([
      { label: "a".repeat(50), instruction: "b".repeat(500) },
    ]);
    expect(s.label).toHaveLength(30);
    expect(s.instruction).toHaveLength(300);
  });

  it("drops empties, non-objects and duplicate labels (case-insensitive)", () => {
    const out = sanitizeSuggestions([
      null,
      "x",
      { label: " ", instruction: "ok" },
      { label: "A", instruction: "" },
      { label: "Sombra", instruction: "um" },
      { label: "sombra", instruction: "dois" },
    ]);
    expect(out).toEqual([{ label: "Sombra", instruction: "um" }]);
  });

  it("caps at 4", () => {
    const list = Array.from({ length: 8 }, (_, i) => ({ label: `L${i}`, instruction: "i" }));
    expect(sanitizeSuggestions(list)).toHaveLength(4);
  });
});

describe("fillWithFallback", () => {
  it("fills 2 items up to 4 without duplicate labels", () => {
    const out = fillWithFallback([
      { label: "Modo escuro", instruction: "x" },
      { label: "Outro", instruction: "y" },
    ]);
    expect(out).toHaveLength(4);
    expect(new Set(out.map((s) => s.label.toLowerCase())).size).toBe(4);
  });

  it("returns the 4 fallbacks for an empty list", () => {
    expect(fillWithFallback([])).toEqual(FALLBACK_SUGGESTIONS);
  });

  it("leaves 4 items unchanged", () => {
    expect(fillWithFallback(MOCK_SUGGESTIONS)).toEqual(MOCK_SUGGESTIONS);
  });
});
