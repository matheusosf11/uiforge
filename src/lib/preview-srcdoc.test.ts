/// <reference types="vitest/globals" />
import {
  buildPreviewSrcdoc,
  PREVIEW_RUNTIME,
  rewriteGeneratedCodeForPreview,
} from "./preview-srcdoc";

const SAMPLE = `import { useState } from "react";

export default function Button() {
  const [n, setN] = useState(0);
  return <button className="rounded bg-indigo-600 px-4 py-2 text-white" onClick={() => setN(n + 1)}>Click {n}</button>;
}`;

describe("rewriteGeneratedCodeForPreview", () => {
  it("rewrites react named imports to the UMD React global", () => {
    const rewritten = rewriteGeneratedCodeForPreview(SAMPLE);
    expect(rewritten).toContain("const { useState } = React;");
    expect(rewritten).not.toContain("from \"react\"");
  });

  it("rewrites export default into __Generated", () => {
    const rewritten = rewriteGeneratedCodeForPreview(SAMPLE);
    expect(rewritten).toContain("const __Generated = function Button()");
    expect(rewritten).not.toMatch(/export\s+default/);
  });

  it("strips semicolon-free import type without eating following code", () => {
    const code = `import type { Props } from "./types"
const label = "keep me";
export default function A() {
  return <p>{label}</p>;
}`;
    const rewritten = rewriteGeneratedCodeForPreview(code);
    expect(rewritten).not.toContain("import type");
    expect(rewritten).toContain('const label = "keep me";');
    expect(rewritten).toContain("const __Generated = function A()");
  });

  it("strips multi-line and semicolon-terminated import type", () => {
    const code = `import type {
  A,
  B,
} from "./types";
export default function C() { return null; }`;
    const rewritten = rewriteGeneratedCodeForPreview(code);
    expect(rewritten).not.toContain("import type");
    expect(rewritten).not.toContain("./types");
    expect(rewritten).toContain("const __Generated = function C()");
  });
});

describe("buildPreviewSrcdoc", () => {
  it("loads the pinned runtime (Tailwind v4, React, Babel) from the app itself", () => {
    const srcdoc = buildPreviewSrcdoc(SAMPLE);
    expect(srcdoc).toContain(
      '<script src="/preview-runtime/tailwind-browser-4.3.3.js"></script>',
    );
    for (const src of Object.values(PREVIEW_RUNTIME)) {
      expect(srcdoc).toContain(`src="${src}"`);
    }
    // Third-party CDNs get blocked by ad/privacy extensions (blank preview).
    expect(srcdoc).not.toContain("cdn.jsdelivr.net");
    expect(srcdoc).not.toContain("cdn.tailwindcss.com");
  });

  it("always declares color-scheme light (D-17)", () => {
    const srcdoc = buildPreviewSrcdoc(SAMPLE);
    expect(srcdoc).toContain('<meta name="color-scheme" content="light"');
    expect(srcdoc).toContain("color-scheme: light;");
    expect(srcdoc).toContain("background: #fff");
    expect(srcdoc).not.toContain("light dark");
  });

  it("dark theme sets the dark class, scheme and background, and dark: follows the class", () => {
    const srcdoc = buildPreviewSrcdoc(SAMPLE, { theme: "dark" });
    expect(srcdoc).toContain('<html class="dark">');
    expect(srcdoc).toContain('<meta name="color-scheme" content="dark"');
    expect(srcdoc).toContain("background: #020617");
    expect(srcdoc).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(buildPreviewSrcdoc(SAMPLE)).toContain("<html>");
  });

  it("does not execute generated code on the host document", () => {
    const srcdoc = buildPreviewSrcdoc(SAMPLE);
    expect(srcdoc).toContain("const __Generated = function Button()");
    expect(srcdoc).toContain('type: "uiforge-preview-error"');
  });
});
