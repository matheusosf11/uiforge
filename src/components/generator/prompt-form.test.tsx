/// <reference types="vitest/globals" />
import { useState } from "react";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptForm } from "@/components/generator/prompt-form";

function Harness({
  onSubmit,
  onStop,
}: {
  onSubmit: () => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <PromptForm
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      onStop={onStop}
      isLoading={false}
    />
  );
}

describe("PromptForm", () => {
  it("keeps Gerar disabled until the prompt has text, then submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} onStop={vi.fn()} />);

    const generate = screen.getByRole("button", { name: "Gerar" });
    expect((generate as HTMLButtonElement).disabled).toBe(true);

    await user.type(
      screen.getByRole("textbox", { name: "Prompt" }),
      "Um botão verde",
    );
    expect((generate as HTMLButtonElement).disabled).toBe(false);

    await user.click(generate);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("limits the prompt to the server max length and shows a counter", async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} onStop={vi.fn()} />);

    const textarea = screen.getByRole("textbox", {
      name: "Prompt",
    }) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(2000);
    expect(screen.getByText("0/2000 caracteres")).toBeTruthy();

    await user.type(textarea, "abc");
    expect(screen.getByText("3/2000 caracteres")).toBeTruthy();
  });

  describe("example chips", () => {
    const BOTAO = "botão primário com ícone";

    function chip(name: string) {
      return screen.getByRole("button", { name: new RegExp(`^${name}:`) });
    }

    it("renders 12 chips and no Exemplos heading", () => {
      render(<Harness onSubmit={vi.fn()} onStop={vi.fn()} />);
      const chips = screen
        .getAllByRole("button")
        .filter((b) => b.hasAttribute("aria-pressed"));
      expect(chips).toHaveLength(12);
      expect(screen.queryByText("Exemplos")).toBeNull();
    });

    it("fills the prompt on click without submitting", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness onSubmit={onSubmit} onStop={vi.fn()} />);

      await user.click(chip("Botão"));
      expect(
        (screen.getByRole("textbox", { name: "Prompt" }) as HTMLTextAreaElement)
          .value,
      ).toBe(BOTAO);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("exposes full prompt as accessible name and title", () => {
      render(<Harness onSubmit={vi.fn()} onStop={vi.fn()} />);
      const el = screen.getByRole("button", { name: `Botão: ${BOTAO}` });
      expect(el.getAttribute("title")).toBe(BOTAO);
    });

    it("highlights the selected chip until the prompt is edited", async () => {
      const user = userEvent.setup();
      render(<Harness onSubmit={vi.fn()} onStop={vi.fn()} />);

      await user.click(chip("Botão"));
      expect(chip("Botão").getAttribute("aria-pressed")).toBe("true");

      await user.type(screen.getByRole("textbox", { name: "Prompt" }), "x");
      expect(chip("Botão").getAttribute("aria-pressed")).toBe("false");
    });

    it("clears the highlight after submitting even if text is unchanged", async () => {
      const user = userEvent.setup();
      render(<Harness onSubmit={vi.fn()} onStop={vi.fn()} />);

      await user.click(chip("Botão"));
      await user.click(screen.getByRole("button", { name: "Gerar" }));
      expect(chip("Botão").getAttribute("aria-pressed")).toBe("false");

      await user.click(chip("Card"));
      await user.type(
        screen.getByRole("textbox", { name: "Prompt" }),
        "{Control>}{Enter}{/Control}",
      );
      expect(chip("Card").getAttribute("aria-pressed")).not.toBe("true");
    });

    it("disables all chips while loading", () => {
      render(
        <PromptForm
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onStop={vi.fn()}
          isLoading
        />,
      );
      const chips = screen
        .getAllByRole("button")
        .filter((b) => b.hasAttribute("aria-pressed"));
      expect(chips).toHaveLength(12);
      for (const c of chips) expect((c as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe("refine mode", () => {
    const CHIPS = [
      { id: "a", label: "Maior", prompt: "Aumente o botão" },
      { id: "b", label: "Escuro", prompt: "Use tema escuro" },
    ];

    function RefineHarness({
      onSubmit = vi.fn(),
      chips,
      isLoading = false,
      turnList,
      baseNotice,
    }: {
      onSubmit?: () => void;
      chips: typeof CHIPS | null;
      isLoading?: boolean;
      turnList?: ReactNode;
      baseNotice?: string | null;
    }) {
      const [value, setValue] = useState("");
      return (
        <PromptForm
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          onStop={vi.fn()}
          isLoading={isLoading}
          mode="refine"
          chips={chips}
          sessionBar={<div data-testid="bar">barra</div>}
          turnList={turnList}
          baseNotice={baseNotice}
        />
      );
    }

    function pressable() {
      return screen
        .queryAllByRole("button")
        .filter((b) => b.hasAttribute("aria-pressed"));
    }

    it("switches title, label, placeholder and button; Ctrl+Enter submits", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<RefineHarness chips={CHIPS} onSubmit={onSubmit} />);
      expect(
        screen.getByRole("heading", { name: "Refinar componente" }),
      ).toBeTruthy();
      const ta = screen.getByRole("textbox", { name: "Descreva a mudança" });
      expect(ta.getAttribute("placeholder")).toBe(
        "Descreva a mudança… (⌘/Ctrl+Enter para refinar)",
      );
      expect(screen.getByRole("button", { name: "Refinar" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Gerar" })).toBeNull();
      await user.type(ta, "x{Control>}{Enter}{/Control}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("chip click prefills and focuses without submitting", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<RefineHarness chips={CHIPS} onSubmit={onSubmit} />);
      expect(
        screen.getByRole("group", { name: "Sugestões de refinamento" }),
      ).toBeTruthy();
      expect(pressable()).toHaveLength(2);

      const chip = screen.getByRole("button", {
        name: "Maior: Aumente o botão",
      });
      expect(chip.getAttribute("title")).toBe("Aumente o botão");
      await user.click(chip);
      const ta = screen.getByRole("textbox", {
        name: "Descreva a mudança",
      }) as HTMLTextAreaElement;
      expect(ta.value).toBe("Aumente o botão");
      expect(document.activeElement).toBe(ta);
      expect(ta.selectionStart).toBe(ta.value.length);
      expect(chip.getAttribute("aria-pressed")).toBe("true");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("disables chips while loading", () => {
      render(<RefineHarness chips={CHIPS} isLoading />);
      for (const c of pressable())
        expect((c as HTMLButtonElement).disabled).toBe(true);
    });

    it("renders 4 skeleton chips with aria-busy when chips is null", () => {
      const { container } = render(<RefineHarness chips={null} />);
      const busy = container.querySelector('[aria-busy="true"]');
      expect(busy).not.toBeNull();
      expect(busy!.children).toHaveLength(4);
      expect(busy!.textContent).toBe("");
      expect(pressable()).toHaveLength(0);
    });

    it("renders the sessionBar slot above the title", () => {
      render(<RefineHarness chips={CHIPS} />);
      const bar = screen.getByTestId("bar");
      const title = screen.getByRole("heading", { name: "Refinar componente" });
      expect(
        bar.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("renders the turnList slot between the sessionBar and the title", () => {
      render(
        <RefineHarness
          chips={CHIPS}
          turnList={<div data-testid="turns">turnos</div>}
        />,
      );
      const bar = screen.getByTestId("bar");
      const turns = screen.getByTestId("turns");
      const title = screen.getByRole("heading", { name: "Refinar componente" });
      expect(
        bar.compareDocumentPosition(turns) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        turns.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("renders the base notice between the title and the textarea and describes the textarea", () => {
      const notice = "Refinar a partir da v1 — v2 será descartada";
      const { container } = render(
        <RefineHarness chips={CHIPS} baseNotice={notice} />,
      );
      const el = container.querySelector("#refine-base-notice");
      expect(el).not.toBeNull();
      expect(el!.textContent).toBe(notice);
      const title = screen.getByRole("heading", { name: "Refinar componente" });
      const ta = screen.getByRole("textbox", { name: "Descreva a mudança" });
      expect(
        title.compareDocumentPosition(el!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        el!.compareDocumentPosition(ta) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(ta.getAttribute("aria-describedby")).toBe(
        "refine-base-notice prompt-char-count",
      );
    });

    it("omits the base notice when baseNotice is null or missing", () => {
      const { container, unmount } = render(
        <RefineHarness chips={CHIPS} baseNotice={null} />,
      );
      expect(container.querySelector("#refine-base-notice")).toBeNull();
      expect(
        screen
          .getByRole("textbox", { name: "Descreva a mudança" })
          .getAttribute("aria-describedby"),
      ).toBe("prompt-char-count");
      unmount();
      const second = render(<RefineHarness chips={CHIPS} />);
      expect(second.container.querySelector("#refine-base-notice")).toBeNull();
      expect(
        screen
          .getByRole("textbox", { name: "Descreva a mudança" })
          .getAttribute("aria-describedby"),
      ).toBe("prompt-char-count");
    });

    it("does not make the base notice a live region", () => {
      const { container } = render(
        <RefineHarness chips={CHIPS} baseNotice="Refinar a partir da v1" />,
      );
      const el = container.querySelector("#refine-base-notice")!;
      expect(el.hasAttribute("aria-live")).toBe(false);
      expect(el.getAttribute("role")).toBeNull();
    });

    it("exposes the textarea through textareaRef", () => {
      const ref = { current: null as HTMLTextAreaElement | null };
      render(
        <PromptForm
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onStop={vi.fn()}
          isLoading={false}
          textareaRef={ref}
        />,
      );
      expect(ref.current).toBe(screen.getByRole("textbox", { name: "Prompt" }));
    });
  });

  describe("reference images", () => {
    const base = {
      value: "x",
      onChange: () => {},
      onSubmit: () => {},
      onStop: () => {},
      isLoading: false,
    };
    const png = (name = "print.png") => new File(["x"], name, { type: "image/png" });
    const attached = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        name: `img-${i + 1}.png`,
        src: `data:image/jpeg;base64,A${i}`,
      }));

    it("hides the image controls when attaching is not wired", () => {
      render(<PromptForm {...base} />);
      expect(screen.queryByRole("button", { name: /Imagem/ })).toBeNull();
    });

    it("attaches several picked files at once", async () => {
      const user = userEvent.setup();
      const onAttachImages = vi.fn();
      render(<PromptForm {...base} onAttachImages={onAttachImages} />);
      const files = [png("a.png"), png("b.png")];
      await user.upload(screen.getByLabelText("Anexar imagem de referência"), files);
      expect(onAttachImages).toHaveBeenCalledWith(files);
    });

    it("lists the attached images in order and removes one by index", async () => {
      const user = userEvent.setup();
      const onRemoveImage = vi.fn();
      render(
        <PromptForm
          {...base}
          onAttachImages={vi.fn()}
          onRemoveImage={onRemoveImage}
          images={attached(2)}
        />,
      );
      expect(screen.getByRole("list", { name: "Imagens de referência (2 de 4)" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Imagem 1 anexada" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Imagem 2 anexada" })).toBeTruthy();
      expect(screen.getByText("img-2.png")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Imagem (2/4)" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Remover imagem 2" }));
      expect(onRemoveImage).toHaveBeenCalledWith(1);
    });

    it("disables attaching once 4 images are attached", () => {
      const onAttachImages = vi.fn();
      render(
        <PromptForm {...base} onAttachImages={onAttachImages} images={attached(4)} />,
      );
      const button = screen.getByRole("button", { name: "Imagem (4/4)" }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.title).toBe("Máximo de 4 imagens");
      fireEvent.paste(screen.getByRole("textbox", { name: "Prompt" }), {
        clipboardData: { files: [png()] },
      });
      expect(onAttachImages).not.toHaveBeenCalled();
    });

    it("attaches pasted or dropped images, ignoring other files", () => {
      const onAttachImages = vi.fn();
      render(<PromptForm {...base} onAttachImages={onAttachImages} />);
      const field = screen.getByRole("textbox", { name: "Prompt" });
      const pasted = png();
      fireEvent.paste(field, { clipboardData: { files: [pasted] } });
      expect(onAttachImages).toHaveBeenLastCalledWith([pasted]);
      const a = png("a.png");
      const b = png("b.png");
      const txt = new File(["x"], "notes.txt", { type: "text/plain" });
      fireEvent.drop(field, { dataTransfer: { files: [a, txt, b], types: ["Files"] } });
      expect(onAttachImages).toHaveBeenLastCalledWith([a, b]);
    });

    it("shows the refusal message and disables attaching while loading", () => {
      render(
        <PromptForm
          {...base}
          isLoading
          onAttachImages={vi.fn()}
          imageError="Use uma imagem PNG, JPG ou WebP."
        />,
      );
      expect(screen.getByRole("alert").textContent).toBe(
        "Use uma imagem PNG, JPG ou WebP.",
      );
      expect(
        (screen.getByRole("button", { name: "Imagem" }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });
  });
});
