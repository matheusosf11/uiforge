/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TransientTurnItem,
  TurnItem,
} from "@/components/generator/turn-item";

describe("TurnItem", () => {
  it("renders a 'before' version as a restorable button", async () => {
    const onRestore = vi.fn();
    render(
      <TurnItem
        number={2}
        text="azul"
        position="before"
        busy={false}
        onRestore={onRestore}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Restaurar v2: azul. Concluída.",
    });
    expect(button).toHaveAttribute("title", "azul");
    expect(button).not.toHaveAttribute("aria-current");
    expect(button).toHaveTextContent("v2");
    expect(button).toHaveTextContent("azul");
    await userEvent.click(button);
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("renders the current version with aria-current and the 'atual' badge", async () => {
    const onRestore = vi.fn();
    render(
      <TurnItem
        number={2}
        text="azul"
        position="current"
        busy={false}
        onRestore={onRestore}
      />,
    );
    const button = screen.getByRole("button", {
      name: "v2, versão atual: azul. Concluída.",
    });
    expect(button).toHaveAttribute("aria-current", "true");
    expect(button).toHaveTextContent("atual");
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("dims the instruction of a 'later' version but not its label", () => {
    render(
      <TurnItem
        number={3}
        text="verde"
        position="later"
        busy={false}
        onRestore={() => {}}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Restaurar v3: verde. Concluída. Será descartada ao refinar.",
    });
    expect(screen.getByText("verde")).toHaveClass("opacity-50");
    expect(screen.getByText("v3")).not.toHaveClass("opacity-50");
    expect(button).toBeInTheDocument();
  });

  it.each(["before", "current", "later"] as const)(
    "disables the %s button while busy",
    (position) => {
      render(
        <TurnItem
          number={1}
          text="um card"
          position={position}
          busy
          onRestore={() => {}}
        />,
      );
      expect(screen.getByRole("button")).toBeDisabled();
    },
  );

  it("renders 'Edição manual' text in the label", () => {
    render(
      <TurnItem
        number={4}
        text="Edição manual"
        position="before"
        busy={false}
        onRestore={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Restaurar v4: Edição manual. Concluída.",
      }),
    ).toHaveTextContent("Edição manual");
  });
});

describe("TransientTurnItem", () => {
  it("renders the gerando row without a button", () => {
    const { container } = render(
      <TransientTurnItem kind="gerando" instruction="mais" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container).toHaveTextContent("Gerando: mais");
    expect(screen.getByText("gerando…")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the erro row without a button", () => {
    const { container } = render(
      <TransientTurnItem kind="erro" instruction="mais" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container).toHaveTextContent("Erro: mais");
    expect(screen.getByText("erro")).toHaveAttribute("aria-hidden", "true");
  });
});
