/// <reference types="vitest/globals" />
import { useState } from "react";
import { render, screen } from "@testing-library/react";
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
});
