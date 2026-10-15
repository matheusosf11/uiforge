/// <reference types="vitest/globals" />
import {
  APP_PATH,
  APP_WRAPPER,
  COMPONENT_PATH,
  buildSandpackFiles,
  hasDefaultExport,
} from "./sandpack-files";

const SAMPLE = `export default function Button() {
  return <button className="rounded bg-indigo-600 px-4 py-2 text-white">Click</button>;
}`;

describe("buildSandpackFiles", () => {
  it("maps the generated component to a hidden /Component.tsx", () => {
    expect(buildSandpackFiles(SAMPLE)[COMPONENT_PATH]).toEqual({
      code: SAMPLE,
      hidden: true,
    });
  });

  it("maps the wrapper to a hidden /App.tsx", () => {
    expect(buildSandpackFiles(SAMPLE)[APP_PATH]).toEqual({
      code: APP_WRAPPER,
      hidden: true,
    });
  });

  it("keeps the wrapper as a default-export App that imports Component", () => {
    expect(APP_WRAPPER).toContain('import Component from "./Component"');
    expect(APP_WRAPPER).toContain("export default function App()");
  });

  it("does not use the legacy /src/App.tsx path", () => {
    const files = buildSandpackFiles(SAMPLE);
    expect(files).not.toHaveProperty("/src/App.tsx");
  });

  it("overrides /index.tsx with named React 19 imports", () => {
    const files = buildSandpackFiles(SAMPLE);
    expect(files["/index.tsx"].code).toContain(
      'import { StrictMode } from "react"',
    );
    expect(files["/index.tsx"].code).not.toContain(
      'import React, { StrictMode } from "react"',
    );
  });
});

describe("hasDefaultExport", () => {
  it("is true for a default-exported function", () => {
    expect(
      hasDefaultExport("export default function X(){return null}"),
    ).toBe(true);
  });

  it("is true for export default X", () => {
    expect(hasDefaultExport("export default X")).toBe(true);
  });

  it("is false for a named-only export", () => {
    expect(hasDefaultExport("export function X(){return null}")).toBe(false);
  });

  it("is false for empty source", () => {
    expect(hasDefaultExport("")).toBe(false);
  });
});
