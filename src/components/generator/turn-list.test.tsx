/// <reference types="vitest/globals" />
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TransientTurnItem,
  TurnItem,
} from "@/components/generator/turn-item";
import {
  TurnList,
  scrollIntoContainer,
} from "@/components/generator/turn-list";
import type { Version } from "@/lib/session";

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

  it("calls onRestore on the current item with allowCurrentClick", async () => {
    const onRestore = vi.fn();
    render(
      <TurnItem
        number={2}
        text="azul"
        position="current"
        busy={false}
        onRestore={onRestore}
        allowCurrentClick
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "v2, versão atual: azul. Concluída." }),
    );
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

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

  it("renders the rascunho row without a button, status word or sr-only prefix", () => {
    const { container } = render(
      <TransientTurnItem kind="rascunho" instruction="ignorada" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container).toHaveTextContent(/^Edição manual \(rascunho\)$/);
    const text = screen.getByText("Edição manual (rascunho)");
    expect(text).toHaveAttribute("title", "Edição manual (rascunho)");
    expect(screen.queryByText("gerando…")).toBeNull();
    expect(screen.queryByText("erro")).toBeNull();
    expect(container.querySelector(".sr-only")).toBeNull();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("text-muted-foreground");
  });
});

function makeVersions(instructions: string[], firstId = 1): Version[] {
  return instructions.map((instruction, i) => ({
    id: firstId + i,
    code: `export default function C${i}() {\n  return <div>${i}</div>;\n}`,
    instruction,
    source: "ai",
  }));
}

type ListProps = Parameters<typeof TurnList>[0];

function renderList(overrides: Partial<ListProps> = {}) {
  const props: ListProps = {
    versions: makeVersions(["um card", "azul", "verde"]),
    cursor: 2,
    droppedCount: 0,
    busy: false,
    transient: null,
    open: false,
    onOpenChange: vi.fn(),
    onRestore: vi.fn(),
    ...overrides,
  };
  const utils = render(<TurnList {...props} />);
  return { ...utils, props };
}

function list() {
  return screen.getByRole("list", { name: "Histórico de versões" });
}

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe("TurnList", () => {
  it("renders one item per version, oldest first, with the current marked", () => {
    renderList();
    const items = within(list()).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    const buttons = within(list()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent?.slice(0, 2))).toEqual([
      "v1",
      "v2",
      "v3",
    ]);
    expect(buttons[2]).toHaveAttribute("aria-current", "true");
    expect(buttons[0]).not.toHaveAttribute("aria-current");
  });

  it("keeps an explicit list role on the ol (WR-02, WebKit list-style none)", () => {
    renderList();
    expect(list().tagName).toBe("OL");
    expect(list()).toHaveAttribute("role", "list");
  });

  it("marks versions after the cursor as later and restores by id", async () => {
    const { props } = renderList({ cursor: 0 });
    const v2 = screen.getByRole("button", {
      name: "Restaurar v2: azul. Concluída. Será descartada ao refinar.",
    });
    expect(
      screen.getByRole("button", {
        name: "Restaurar v3: verde. Concluída. Será descartada ao refinar.",
      }),
    ).toBeInTheDocument();
    await userEvent.click(v2);
    expect(props.onRestore).toHaveBeenCalledWith(props.versions[1].id);
  });

  it("shows 'Edição manual' for manual versions", () => {
    const versions = makeVersions(["um card", "ignored"]);
    versions[1] = { ...versions[1], source: "manual" };
    renderList({ versions, cursor: 1 });
    expect(
      screen.getByRole("button", {
        name: "v2, versão atual: Edição manual. Concluída.",
      }),
    ).toBeInTheDocument();
  });

  it("offsets numbers by droppedCount and shows the cap line", () => {
    renderList({
      versions: makeVersions(["a", "b"], 10),
      cursor: 1,
      droppedCount: 4,
    });
    const buttons = within(list()).getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("v5");
    expect(buttons[1]).toHaveTextContent("v6");
    const cap = screen.getByText(
      "Versões mais antigas descartadas (limite de 20)",
    );
    expect(document.getElementById("turn-list-region")).toContainElement(cap);
    expect(cap.closest("li")).toBeNull();
  });

  it("hides the cap line when nothing was dropped", () => {
    renderList();
    expect(
      screen.queryByText("Versões mais antigas descartadas (limite de 20)"),
    ).toBeNull();
  });

  it("renders a transient row as the last, non-interactive item", () => {
    renderList({ transient: { kind: "gerando", instruction: "mais" } });
    const items = within(list()).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[3]).queryByRole("button")).toBeNull();
    expect(items[3]).toHaveTextContent("Gerando: mais");
  });

  it("renders the rascunho row as the last item", () => {
    renderList({ transient: { kind: "rascunho", instruction: "" } });
    const items = within(list()).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[3]).queryByRole("button")).toBeNull();
    expect(items[3]).toHaveTextContent("Edição manual (rascunho)");
  });

  it("keeps the rascunho row last after dimmed later versions", () => {
    renderList({
      versions: makeVersions(["um card", "azul"]),
      cursor: 0,
      transient: { kind: "rascunho", instruction: "" },
    });
    const items = within(list()).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent("azul");
    expect(items[2]).toHaveTextContent("Edição manual (rascunho)");
  });

  it("lets the current item restore while a draft is active", async () => {
    const { props } = renderList({ draftActive: true });
    await userEvent.click(
      screen.getByRole("button", { name: "v3, versão atual: verde. Concluída." }),
    );
    expect(props.onRestore).toHaveBeenCalledTimes(1);
    expect(props.onRestore).toHaveBeenCalledWith(props.versions[2].id);
  });

  it("keeps the current item a no-op without a draft", async () => {
    const { props } = renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "v3, versão atual: verde. Concluída." }),
    );
    expect(props.onRestore).not.toHaveBeenCalled();
  });

  it("renders no extra item without a transient", () => {
    renderList();
    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
  });

  it("disables every version button while busy", () => {
    renderList({ busy: true });
    for (const b of within(list()).getAllByRole("button")) {
      expect(b).toBeDisabled();
    }
  });

  it("exposes a mobile disclosure controlling the region", async () => {
    const { props, rerender } = renderList({
      transient: { kind: "gerando", instruction: "mais" },
    });
    const toggle = screen.getByRole("button", { name: "Histórico (3)" });
    expect(toggle).toHaveAttribute("aria-controls", "turn-list-region");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("turn-list-region")).not.toBeNull();
    await userEvent.click(toggle);
    expect(props.onOpenChange).toHaveBeenCalledWith(true);
    rerender(<TurnList {...props} open />);
    expect(
      screen.getByRole("button", { name: "Histórico (3)" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("turn-list-region")).not.toBeNull();
  });

  it("keeps the same DOM nodes when the cursor changes", () => {
    const { props, rerender } = renderList();
    const before = within(list()).getAllByRole("button")[0];
    rerender(<TurnList {...props} cursor={0} />);
    const after = within(list()).getAllByRole("button")[0];
    expect(after).toBe(before);
  });
});

describe("scrollIntoContainer", () => {
  // Container metrics: border-box rect plus clientTop (border) and
  // clientHeight (padding box height), like a laid-out element.
  function setup(
    c: DOMRect,
    e: DOMRect,
    scrollTop: number,
    { border = 0, padding = 0 }: { border?: number; padding?: number } = {},
  ) {
    const container = document.createElement("div");
    const el = document.createElement("div");
    container.style.padding = `${padding}px`;
    container.getBoundingClientRect = () => c;
    el.getBoundingClientRect = () => e;
    Object.defineProperty(container, "clientTop", { value: border });
    Object.defineProperty(container, "clientHeight", {
      value: c.bottom - c.top - 2 * border,
    });
    container.scrollTop = scrollTop;
    return { container, el };
  }

  it("scrolls down when the element is below the container", () => {
    const { container, el } = setup(rect(0, 100), rect(120, 152), 0);
    scrollIntoContainer(container, el);
    // Keeps the 3px focus ring inside the scrollport.
    expect(container.scrollTop).toBe(55);
  });

  it("scrolls up when the element is above the container", () => {
    const { container, el } = setup(rect(100, 200), rect(60, 92), 80);
    scrollIntoContainer(container, el);
    expect(container.scrollTop).toBe(37);
  });

  it("leaves the scroll unchanged when the element is visible", () => {
    const { container, el } = setup(rect(0, 100), rect(20, 52), 30);
    scrollIntoContainer(container, el);
    expect(container.scrollTop).toBe(30);
  });

  it("aligns above to the padding box, not the border box (WR-03)", () => {
    // 1px border + 4px padding (p-1): the item must land at 100 + 1 + 4.
    const { container, el } = setup(rect(100, 200), rect(100, 132), 80, {
      border: 1,
      padding: 4,
    });
    scrollIntoContainer(container, el);
    expect(container.scrollTop).toBe(75);
  });

  it("aligns below to the padding box, not the border box (WR-03)", () => {
    // Inner bottom = 0 + 1 + 98 = 99; minus 4px padding = 95.
    const { container, el } = setup(rect(0, 100), rect(68, 100), 0, {
      border: 1,
      padding: 4,
    });
    scrollIntoContainer(container, el);
    expect(container.scrollTop).toBe(5);
  });

  it("treats an item inside the padding margin as visible", () => {
    const { container, el } = setup(rect(0, 100), rect(5, 95), 10, {
      border: 1,
      padding: 4,
    });
    scrollIntoContainer(container, el);
    expect(container.scrollTop).toBe(10);
  });

  it("does nothing when the container is not laid out", () => {
    const container = document.createElement("div");
    const el = document.createElement("div");
    container.getBoundingClientRect = () => rect(0, 0);
    el.getBoundingClientRect = () => rect(120, 152);
    container.scrollTop = 7;
    scrollIntoContainer(container, el);
    expect(container.scrollTop).toBe(7);
  });
});
