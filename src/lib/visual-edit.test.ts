/// <reference types="vitest/globals" />
import {
  applyVisual,
  detectAccent,
  detectNeutral,
  ORIGINAL_SETTINGS,
  replaceFamily,
  setBorders,
  setFont,
  shiftRadius,
  shiftSpacing,
  shiftText,
} from "./visual-edit";

const CARD = `export default function Card() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900">Plano Pro</h2>
      <p className="mt-2 text-sm text-slate-600">R$ 49/mês</p>
      <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500 bg-indigo-600/20">Assinar</button>
      <span className="rounded-full bg-emerald-100 text-emerald-700 -mt-2 border-t-2">Ativo</span>
    </div>
  );
}`;

describe("color families", () => {
  it("detects the accent and the neutral family", () => {
    expect(detectAccent(CARD)).toBe("indigo");
    expect(detectNeutral(CARD)).toBe("slate");
    expect(detectAccent("<div className='bg-white' />")).toBeNull();
  });

  it("swaps a family in every color utility, variant and opacity, nothing else", () => {
    const out = replaceFamily(CARD, "indigo", "rose");
    expect(out).toContain("bg-rose-600 px-4");
    expect(out).toContain("hover:bg-rose-500");
    expect(out).toContain("focus-visible:ring-rose-500");
    expect(out).toContain("bg-rose-600/20");
    expect(out).not.toContain("indigo");
    expect(out).toContain("bg-emerald-100");
    expect(replaceFamily("const indigo = 'bg-indigo-600-ish';", "indigo", "rose")).toBe(
      "const indigo = 'bg-indigo-600-ish';",
    );
  });
});

describe("scales", () => {
  it("shifts radius keeping sides and rounded-full", () => {
    const out = shiftRadius(
      'className="rounded rounded-xl rounded-t-lg rounded-full rounded-none"',
      1,
    );
    expect(out).toBe('className="rounded-md rounded-2xl rounded-t-xl rounded-full rounded-xs"');
    expect(shiftRadius('className="rounded-lg"', -10)).toBe('className="rounded-none"');
  });

  it("shifts padding, margin and gaps, but not negative or arbitrary values", () => {
    const out = shiftSpacing(
      'className="p-6 px-4 mt-2 gap-x-3 space-y-1.5 -mt-2 p-0 p-px m-auto w-4"',
      1,
    );
    expect(out).toBe('className="p-7 px-5 mt-2.5 gap-x-3.5 space-y-2 -mt-2 p-0 p-px m-auto w-4"');
    expect(shiftSpacing('className="p-0.5"', -3)).toBe('className="p-0.5"');
  });

  it("shifts text sizes and leaves text colors alone", () => {
    expect(shiftText('className="text-sm text-lg text-slate-600 text-base/7"', 1)).toBe(
      'className="text-base text-xl text-slate-600 text-lg/7"',
    );
  });
});

describe("borders and font", () => {
  it("removes or thickens borders without touching border colors or styles", () => {
    const code = 'className="border border-t-2 border-slate-200 border-dashed border-0"';
    expect(setBorders(code, "none")).toBe(
      'className="border-0 border-t-0 border-slate-200 border-dashed border-0"',
    );
    expect(setBorders(code, "thick")).toBe(
      'className="border-2 border-t-2 border-slate-200 border-dashed border-0"',
    );
    expect(setBorders(code, "original")).toBe(code);
  });

  it("puts the font on the root element only", () => {
    const code = `export default function A() {\n  return <div className="p-4"><p className="font-mono text-sm">x</p></div>;\n}`;
    const out = setFont(code, "serif");
    expect(out).toContain('<div className="font-serif p-4">');
    expect(out).toContain('<p className="text-sm">');
  });
});

describe("applyVisual", () => {
  it("is the identity with the original settings", () => {
    expect(applyVisual(CARD, ORIGINAL_SETTINGS)).toBe(CARD);
  });

  it("combines every edit from the same base", () => {
    const out = applyVisual(CARD, {
      accent: "emerald",
      neutral: "zinc",
      radius: -1,
      spacing: 1,
      text: 1,
      border: "thick",
      font: "mono",
    });
    expect(out).toContain('className="font-mono rounded-lg border-2 border-zinc-200 bg-white p-7');
    expect(out).toContain("bg-emerald-600");
    expect(out).toContain("text-xl font-semibold text-zinc-900");
    expect(out).not.toContain("slate");
  });
});
