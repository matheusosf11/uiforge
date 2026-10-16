/// <reference types="vitest/globals" />
import {
  buildPreviewSrcdoc,
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
});

describe("buildPreviewSrcdoc", () => {
  it("embeds Tailwind v4 as a pinned jsDelivr script", () => {
    expect(buildPreviewSrcdoc(SAMPLE)).toContain(
      "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js",
    );
    expect(buildPreviewSrcdoc(SAMPLE)).not.toContain("cdn.tailwindcss.com");
  });

  it("always declares color-scheme light (D-17)", () => {
    const srcdoc = buildPreviewSrcdoc(SAMPLE);
    expect(srcdoc).toContain('<meta name="color-scheme" content="light"');
    expect(srcdoc).toContain("color-scheme: light;");
    expect(srcdoc).toContain("background: #fff");
    expect(srcdoc).not.toContain("light dark");
  });

  it("does not execute generated code on the host document", () => {
    const srcdoc = buildPreviewSrcdoc(SAMPLE);
    expect(srcdoc).toContain("const __Generated = function Button()");
    expect(srcdoc).toContain('type: "uiforge-preview-error"');
  });
});
