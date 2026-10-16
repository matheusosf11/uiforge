/// <reference types="vitest/globals" />
import { hasDefaultExport } from "./has-default-export";

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
