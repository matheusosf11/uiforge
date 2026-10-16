/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import { SandboxPreview } from "@/components/generator/sandbox-preview";

describe("SandboxPreview", () => {
  it("keeps the iframe sandbox at allow-scripts only and always light", () => {
    render(<SandboxPreview code="export default function A(){return <div/>}" />);
    const iframe = screen.getByTitle("Live preview");
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(iframe.style.colorScheme).toBe("light");
  });
});
