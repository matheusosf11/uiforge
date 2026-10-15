/// <reference types="vitest/globals" />
import {
  APP_PATH,
  APP_WRAPPER,
  COMPONENT_PATH,
  buildSandpackFiles,
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

  it("does not override the react-ts template entry files", () => {
    const files = buildSandpackFiles(SAMPLE);
    expect(files).not.toHaveProperty("/src/App.tsx");
    expect(files).not.toHaveProperty("/index.tsx");
  });
});
