/// <reference types="vitest/globals" />
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  PREVIEW_LOAD_TIMEOUT_MS,
  SandboxPreview,
} from "@/components/generator/sandbox-preview";

describe("SandboxPreview", () => {
  it("keeps the iframe sandbox at allow-scripts only and always light", () => {
    render(<SandboxPreview code="export default function A(){return <div/>}" />);
    const iframe = screen.getByTitle("Live preview");
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");
    expect(iframe.style.colorScheme).toBe("light");
  });

  it("offers Gerar de novo with the error details when the preview fails", () => {
    const onRegenerate = vi.fn();
    render(
      <SandboxPreview
        code="export default function A(){return <div/>}"
        onRegenerate={onRegenerate}
      />,
    );
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "uiforge-preview-error", message: "Unexpected token (28:12)" },
        }),
      );
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("A IA gerou um código com erro");
    expect(alert).toHaveTextContent("Unexpected token (28:12)");
    fireEvent.click(screen.getByRole("button", { name: /Gerar de novo/ }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("shows a plain Atualizando badge only when updating, without remounting", () => {
    const code = "export default function A(){return <div/>}";
    const { rerender } = render(<SandboxPreview code={code} />);
    expect(screen.queryByText("Atualizando…")).toBeNull();
    const before = screen.getByTitle("Live preview");
    const srcdoc = before.getAttribute("srcdoc");

    rerender(<SandboxPreview code={code} updating />);
    const badge = screen.getByText("Atualizando…");
    expect(badge.tagName).toBe("SPAN");
    expect(badge.getAttribute("role")).toBeNull();
    expect(badge.getAttribute("aria-live")).toBeNull();
    expect(badge.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    const during = screen.getByTitle("Live preview");
    expect(during).toBe(before);
    expect(during.getAttribute("srcdoc")).toBe(srcdoc);

    rerender(<SandboxPreview code={code} updating={false} />);
    expect(screen.queryByText("Atualizando…")).toBeNull();
    expect(screen.getByTitle("Live preview")).toBe(before);
    expect(before.getAttribute("srcdoc")).toBe(srcdoc);
  });

  it("uses a custom regenerateLabel on the runtime-error button", () => {
    render(
      <SandboxPreview
        code="export default function A(){return <div/>}"
        onRegenerate={vi.fn()}
        regenerateLabel="Tentar de novo"
      />,
    );
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "uiforge-preview-error", message: "boom" },
        }),
      );
    });
    expect(screen.getByRole("button", { name: /Tentar de novo/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Gerar de novo/ })).toBeNull();
  });

  describe("load timeout", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("warns and offers a reload when the iframe never reports back", () => {
      render(<SandboxPreview code="export default function A(){return <div/>}" />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(PREVIEW_LOAD_TIMEOUT_MS);
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        "O preview não conseguiu carregar",
      );
      const before = screen.getByTitle("Live preview");
      fireEvent.click(screen.getByRole("button", { name: /Recarregar preview/ }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      // Remounted iframe refetches the runtime.
      expect(screen.getByTitle("Live preview")).not.toBe(before);
    });

    it("stays quiet when the preview reports ready in time", () => {
      render(<SandboxPreview code="export default function A(){return <div/>}" />);
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", { data: { type: "uiforge-preview-ready" } }),
        );
        vi.advanceTimersByTime(PREVIEW_LOAD_TIMEOUT_MS * 2);
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
