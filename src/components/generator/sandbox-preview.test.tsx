/// <reference types="vitest/globals" />
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  PREVIEW_LOAD_TIMEOUT_MS,
  SandboxPreview,
} from "@/components/generator/sandbox-preview";

// Posts as the preview frame with that title (as the sandboxed runtime does).
function post(data: unknown, title = "Live preview") {
  const frame = screen.getByTitle(title) as HTMLIFrameElement;
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin: "null",
      source: frame.contentWindow,
    }),
  );
}

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
      post({ type: "uiforge-preview-error", message: "Unexpected token (28:12)" });
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

  it("keeps the current preview visible while new code loads", () => {
    const a = "export default function A(){return <div>a</div>}";
    const b = "export default function B(){return <div>b</div>}";
    const { rerender } = render(<SandboxPreview code={a} />);
    const front = screen.getByTitle("Live preview");
    const oldDoc = front.getAttribute("srcdoc");

    rerender(<SandboxPreview code={b} />);
    // The old preview stays in front; the new one loads hidden behind it.
    expect(screen.getByTitle("Live preview")).toBe(front);
    expect(front.getAttribute("srcdoc")).toBe(oldDoc);
    const back = screen.getByTitle("Live preview (carregando)");
    expect(back.getAttribute("aria-hidden")).toBe("true");
    expect(back.getAttribute("srcdoc")).not.toBe(oldDoc);

    act(() => {
      post({ type: "uiforge-preview-ready" }, "Live preview (carregando)");
    });
    // Promoted without remounting; the old iframe is gone.
    expect(screen.getByTitle("Live preview")).toBe(back);
    expect(screen.queryByTitle("Live preview (carregando)")).toBeNull();
    expect(front.isConnected).toBe(false);
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
      post({ type: "uiforge-preview-error", message: "boom" });
    });
    expect(screen.getByRole("button", { name: /Tentar de novo/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Gerar de novo/ })).toBeNull();
  });

  describe("errorSource user", () => {
    const valid = "export default function A(){return <div/>}";
    function postError(message = "boom") {
      act(() => {
        post({ type: "uiforge-preview-error", message });
      });
    }

    it("keeps the AI copy by default", () => {
      render(<SandboxPreview code="function A(){return <div/>}" />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "O código gerado não exporta um componente padrão.",
      );
    });

    it("speaks about the user's code on a runtime error", () => {
      render(<SandboxPreview code={valid} errorSource="user" />);
      postError("Unexpected token (3:1)");
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(
        "Seu código tem um erro e o preview não conseguiu rodar. Corrija no editor ou descreva a correção em Refinar.",
      );
      expect(alert).not.toHaveTextContent("A IA gerou");
      expect(within(alert).getByText("Detalhes do erro")).toBeInTheDocument();
      expect(alert).toHaveTextContent("Unexpected token (3:1)");
    });

    it("asks for an export default when it is missing", () => {
      render(
        <SandboxPreview code="function A(){return <div/>}" errorSource="user" />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "O código não exporta um componente padrão. Adicione um export default ao componente.",
      );
    });

    it("renders no regenerate button without onRegenerate", () => {
      render(<SandboxPreview code={valid} errorSource="user" />);
      postError();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("clears the runtime error when the code is fixed", () => {
      const { rerender } = render(
        <SandboxPreview code="export default function A(){return <div>}" errorSource="user" />,
      );
      postError();
      expect(screen.getByRole("alert")).toBeInTheDocument();
      rerender(<SandboxPreview code={valid} errorSource="user" />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("ignores messages from other windows or origins", () => {
    render(<SandboxPreview code="export default function A(){return <div/>}" />);
    const frame = screen.getByTitle("Live preview") as HTMLIFrameElement;
    act(() => {
      // Same window (e.g. a script on the page) and a foreign origin.
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "uiforge-preview-error", message: "spoof" },
          origin: "null",
          source: window,
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "uiforge-preview-error", message: "spoof" },
          origin: "https://evil.example",
          source: frame.contentWindow,
        }),
      );
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() => {
      post({ type: "uiforge-preview-error", message: "real" });
    });
    expect(screen.getByRole("alert")).toHaveTextContent("real");
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
        post({ type: "uiforge-preview-ready" });
        vi.advanceTimersByTime(PREVIEW_LOAD_TIMEOUT_MS * 2);
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
