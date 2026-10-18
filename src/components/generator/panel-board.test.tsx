import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  DEFAULT_PANELS,
  PANEL_ORDER_KEY,
  PanelBoard,
  readPanelOrder,
} from "@/components/generator/panel-board";
import { layout } from "@/components/ui/draggable-widget-grid";

const panels = {
  prompt: <section aria-label="Prompt">prompt</section>,
  preview: <section aria-label="Preview">preview</section>,
  code: <section aria-label="Código">code</section>,
};

afterEach(() => window.localStorage.clear());

describe("readPanelOrder", () => {
  it("returns null without a saved order", () => {
    expect(readPanelOrder()).toBeNull();
  });

  it("restores a valid saved order", () => {
    window.localStorage.setItem(
      PANEL_ORDER_KEY,
      JSON.stringify(["code", "prompt", "preview"]),
    );
    expect(readPanelOrder()?.map((p) => p.id)).toEqual([
      "code",
      "prompt",
      "preview",
    ]);
  });

  it("ignores invalid or tampered data", () => {
    for (const raw of [
      "not json",
      JSON.stringify(["prompt", "prompt", "code"]),
      JSON.stringify(["prompt", "preview"]),
      JSON.stringify(["prompt", "preview", "evil"]),
      JSON.stringify({ a: 1 }),
    ]) {
      window.localStorage.setItem(PANEL_ORDER_KEY, raw);
      expect(readPanelOrder()).toBeNull();
    }
  });
});

describe("layout", () => {
  it("tiles prompt and preview side by side above the wide code card", () => {
    const places = layout(DEFAULT_PANELS, 2);
    const at = Object.fromEntries(places.map((p) => [p.id, p]));
    expect(at.prompt).toMatchObject({ col: 0, row: 0, w: 1, h: 1 });
    expect(at.preview).toMatchObject({ col: 1, row: 0, w: 1, h: 1 });
    expect(at.code).toMatchObject({ col: 0, row: 1, w: 2, h: 1 });
  });

  it("puts the code card on top when it comes first", () => {
    const [prompt, preview, code] = DEFAULT_PANELS;
    const at = Object.fromEntries(
      layout([code, prompt, preview], 2).map((p) => [p.id, p]),
    );
    expect(at.code).toMatchObject({ col: 0, row: 0, w: 2 });
    expect(at.prompt).toMatchObject({ col: 0, row: 1 });
    expect(at.preview).toMatchObject({ col: 1, row: 1 });
  });
});

describe("PanelBoard", () => {
  it("renders the three cards as a labelled list with drag handles", () => {
    render(<PanelBoard panels={panels} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((el) => el.getAttribute("aria-label"))).toEqual([
      "Card Prompt",
      "Card Preview",
      "Card Código",
    ]);
    expect(document.querySelectorAll("[data-drag-handle]")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Restaurar layout/ })).toBeNull();
  });

  it("moves a focused card with Alt + arrow, saves it and can reset", () => {
    render(<PanelBoard panels={panels} />);
    const prompt = screen.getByRole("listitem", { name: "Card Prompt" });
    prompt.focus();
    fireEvent.keyDown(prompt, { key: "ArrowRight", altKey: true });
    expect(JSON.parse(window.localStorage.getItem(PANEL_ORDER_KEY)!)).toEqual([
      "preview",
      "prompt",
      "code",
    ]);
    expect(prompt.getAttribute("aria-posinset")).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: /Restaurar layout/ }));
    expect(window.localStorage.getItem(PANEL_ORDER_KEY)).toBeNull();
    expect(
      screen.getByRole("listitem", { name: "Card Prompt" }).getAttribute("aria-posinset"),
    ).toBe("1");
  });

  it("ignores Alt + arrow typed inside a card's content", () => {
    render(<PanelBoard panels={panels} />);
    fireEvent.keyDown(screen.getByText("prompt"), { key: "ArrowRight", altKey: true });
    expect(window.localStorage.getItem(PANEL_ORDER_KEY)).toBeNull();
  });
});
