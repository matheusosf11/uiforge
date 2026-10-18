import { describe, expect, it } from "vitest";
import { pickRandom, readRobotStatus } from "@/components/generator/robot-status";

describe("readRobotStatus", () => {
  it("is idle with no status", () => {
    expect(readRobotStatus("", false)).toEqual({ mood: "idle", say: null });
  });

  it("works while generating or refining", () => {
    expect(readRobotStatus("Gerando…", false).mood).toBe("working");
    expect(readRobotStatus("Refinando…", false)).toEqual({
      mood: "working",
      say: "Aplicando sua mudança…",
    });
    expect(
      readRobotStatus("Edição salva como v3 · Refinando…", false).mood,
    ).toBe("working");
  });

  it("celebrates a committed version", () => {
    expect(readRobotStatus("Pronto — v4", false)).toEqual({
      mood: "done",
      say: "Pronto! Esta é a v4.",
    });
  });

  it("reacts to navigation and saved edits", () => {
    expect(readRobotStatus("Voltou para v1", false)).toEqual({
      mood: "nav",
      say: "Voltou para v1.",
    });
    expect(readRobotStatus("Edição salva como v3 · Foi para v5", false).say).toBe(
      "Foi para v5.",
    );
    expect(readRobotStatus("Edição salva como v3", false)).toEqual({
      mood: "nav",
      say: "Edição salva como v3.",
    });
  });

  it("shows an error when an alert is visible and nothing is streaming", () => {
    expect(readRobotStatus("", true).mood).toBe("error");
    expect(readRobotStatus("Pronto — v2", true).mood).toBe("error");
    expect(readRobotStatus("Refinando…", true).mood).toBe("working");
  });
});

describe("pickRandom", () => {
  it("never repeats the previous pick", () => {
    const items = ["a", "b", "c"];
    expect(pickRandom(items, "a", () => 0)).toBe("b");
    expect(pickRandom(items, null, () => 0)).toBe("a");
    expect(pickRandom(["only"], "only")).toBe("only");
  });
});
