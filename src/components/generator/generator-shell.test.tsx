/// <reference types="vitest/globals" />
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GeneratorShell } from "@/components/generator/generator-shell";
import { FIXED_COMPONENT, REFINED_COMPONENT } from "@/lib/ai/mock-model";
import {
  CODE_TOO_LARGE_MESSAGE,
  REFINE_ERROR_MESSAGE,
} from "@/lib/generate-error";
import { MAX_CODE_LENGTH } from "@/lib/prompt-limits";

vi.mock("next/dynamic", () => ({
  default: () =>
    function PreviewStub({
      code,
      updating,
      onRegenerate,
    }: {
      code: string;
      updating?: boolean;
      onRegenerate?: () => void;
    }) {
      return (
        <div data-testid="preview" data-code={code}>
          {updating ? "Atualizando…" : null}
          {onRegenerate ? (
            <button type="button" onClick={onRegenerate}>
              Preview: tentar de novo
            </button>
          ) : null}
        </div>
      );
    },
}));

type GenBody = { prompt: string; currentCode?: string };
type GenBehavior = "ok" | "hang" | "error";

const SUGGESTIONS = [
  { label: "Cor forte", instruction: "Use uma cor mais forte." },
  { label: "Borda redonda", instruction: "Deixe as bordas redondas." },
  { label: "Sombra", instruction: "Adicione uma sombra." },
  { label: "Texto maior", instruction: "Aumente o texto." },
];

let genBodies: GenBody[];
let behaviors: GenBehavior[];
let baseOverride: string | null;
let suggestFails: boolean;

function streamResponse(
  text: string,
  mode: GenBehavior,
  signal?: AbortSignal | null,
) {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      signal?.addEventListener("abort", () => {
        try {
          controller.error(new DOMException("aborted", "AbortError"));
        } catch {
          // already closed
        }
      });
      if (mode === "ok") {
        controller.enqueue(enc.encode(text));
        controller.close();
      } else {
        controller.enqueue(enc.encode(text.slice(0, 60)));
        if (mode === "error") controller.error(new Error("boom"));
      }
    },
  });
  return new Response(stream, { status: 200 });
}

function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/suggest") {
        if (suggestFails) return new Response("{}", { status: 500 });
        return new Response(JSON.stringify({ suggestions: SUGGESTIONS }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      const body = JSON.parse(String(init?.body)) as GenBody;
      genBodies.push(body);
      const mode = behaviors.shift() ?? "ok";
      const text = body.currentCode
        ? REFINED_COMPONENT
        : (baseOverride ?? FIXED_COMPONENT);
      return streamResponse(text, mode, init?.signal);
    }),
  );
}

beforeEach(() => {
  genBodies = [];
  behaviors = [];
  baseOverride = null;
  suggestFails = false;
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function generateFirst(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Prompt" }), "um card");
  await user.click(screen.getByRole("button", { name: "Gerar" }));
}

async function refine(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox"), text);
  await user.click(screen.getByRole("button", { name: "Refinar" }));
}

async function twoVersions(user: ReturnType<typeof userEvent.setup>) {
  await generateFirst(user);
  await screen.findByText("Pronto — v1");
  await refine(user, "azul");
  await screen.findByText("Pronto — v2");
}

describe("GeneratorShell", () => {
  it("generates the first version and switches to refine mode", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    expect(screen.getByRole("button", { name: "Gerar" })).toBeDisabled();
    await generateFirst(user);

    expect(await screen.findByText("Pronto — v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refinar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gerar" })).toBeNull();
    expect(screen.getByPlaceholderText(/Descreva a mudança/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Exemplos" })).toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByText("v1 · 1 versão")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Desfazer/ })).toBeDisabled();
    expect(screen.getByTestId("preview")).toHaveAttribute(
      "data-code",
      expect.stringContaining("FixtureCard"),
    );
  });

  it("keeps the previous preview while refining and commits v2", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    behaviors.push("hang");
    await refine(user, "azul");

    expect(await screen.findByText("Refinando…")).toBeInTheDocument();
    expect(screen.getByText("Atualizando…")).toBeInTheDocument();
    expect(screen.getByTestId("preview")).toHaveAttribute(
      "data-code",
      FIXED_COMPONENT.trim(),
    );
    // The code panel streams the new (partial) code.
    expect(genBodies[1].currentCode).toBe(FIXED_COMPONENT.trim());
    await user.click(screen.getByRole("button", { name: "Parar" }));
    await waitFor(() =>
      expect(screen.queryByText("Refinando…")).toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "Refinar" }));
    expect(await screen.findByText("Pronto — v2")).toBeInTheDocument();
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();
    expect(screen.queryByText("Atualizando…")).toBeNull();
    expect(screen.getByTestId("preview")).toHaveAttribute(
      "data-code",
      expect.stringContaining("Refinado"),
    );
  });

  it("failed refine keeps text, version and retries with the same base", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    behaviors.push("error");
    await refine(user, "azul");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(REFINE_ERROR_MESSAGE);
    expect(screen.getByRole("textbox")).toHaveValue("azul");
    expect(screen.getByText("v1 · 1 versão")).toBeInTheDocument();
    expect(screen.getByTestId("preview")).toHaveAttribute(
      "data-code",
      FIXED_COMPONENT.trim(),
    );

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pronto — v2")).toBeInTheDocument();
    expect(genBodies).toHaveLength(3);
    expect(genBodies[2].currentCode).toBe(genBodies[1].currentCode);
    expect(genBodies[2].prompt).toBe("azul");
    // D-02: the committed retry clears the field like a normal submit.
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("preview retry on v1 regenerates without currentCode, on v2 from v1", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    await user.click(
      screen.getByRole("button", { name: "Preview: tentar de novo" }),
    );
    await waitFor(() => expect(genBodies).toHaveLength(2));
    expect(genBodies[1]).toEqual({ prompt: "um card" });
    expect(await screen.findByText("v1 · 1 versão")).toBeInTheDocument();

    await refine(user, "azul");
    await screen.findByText("Pronto — v2");
    await user.click(
      screen.getByRole("button", { name: "Preview: tentar de novo" }),
    );
    await waitFor(() => expect(genBodies).toHaveLength(4));
    expect(genBodies[3]).toEqual({
      prompt: "azul",
      currentCode: FIXED_COMPONENT.trim(),
    });
    expect(await screen.findByText("Pronto — v2")).toBeInTheDocument();
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();
  });

  it("Parar during refine keeps v1 and the typed text", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    behaviors.push("hang");
    await refine(user, "azul");
    await screen.findByText("Refinando…");
    await user.click(screen.getByRole("button", { name: "Parar" }));

    await waitFor(() => expect(screen.queryByText("Refinando…")).toBeNull());
    expect(screen.getByText("v1 · 1 versão")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("azul");
    expect(screen.getByTestId("preview")).toHaveAttribute(
      "data-code",
      FIXED_COMPONENT.trim(),
    );
  });

  it("undoes via button and Ctrl+Z, but not inside the textarea", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);

    await user.click(screen.getByRole("button", { name: /Desfazer/ }));
    expect(await screen.findByText("Voltou para v1")).toBeInTheDocument();
    expect(screen.getByText("v1 · 2 versões")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Desfazer/ })).toBeDisabled();

    // Refine again: truncates at commit, creating v2 again.
    await refine(user, "verde");
    await screen.findByText("Pronto — v2");

    // Ctrl+Z inside the textarea does nothing.
    const box = screen.getByRole("textbox");
    await user.click(box);
    await user.keyboard("{Control>}z{/Control}");
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();

    // Ctrl+Z on body undoes.
    box.blur();
    await user.keyboard("{Control>}z{/Control}");
    expect(await screen.findByText("Voltou para v1")).toBeInTheDocument();
  });

  it("disables Desfazer while streaming", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);

    behaviors.push("hang");
    await refine(user, "mais");
    await screen.findByText("Refinando…");
    expect(screen.getByRole("button", { name: /Desfazer/ })).toBeDisabled();
    await user.keyboard("{Control>}z{/Control}");
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Parar" }));
  });

  it("Novo componente with 2 versions asks, Esc cancels, confirm resets", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);
    await user.type(screen.getByRole("textbox"), "rascunho");

    await user.click(screen.getByRole("button", { name: /Novo componente/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Começar um novo componente?"),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Novo componente/ }));
    await user.click(
      await screen.findByRole("button", { name: "Descartar e começar" }),
    );

    expect(await screen.findByText("Novo componente iniciado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Exemplos" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveValue(
      "rascunho",
    );
    expect(screen.queryByText(/ · \d+ versões?$/)).toBeNull();
    expect(
      screen.queryByRole("list", { name: "Histórico de versões" }),
    ).toBeNull();
    // UI-SPEC section 3: on confirm, focus moves to the textarea.
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveFocus(),
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByRole("textbox", { name: "Prompt" })).toHaveFocus();
  });

  it("Novo componente with a single version resets immediately", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    await user.click(screen.getByRole("button", { name: /Novo componente/ }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(await screen.findByRole("button", { name: "Gerar" })).toBeInTheDocument();
  });

  it("shows suggestion chips that prefill without sending", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    const group = screen.getByRole("group", { name: "Sugestões de refinamento" });
    const chip = await within(group).findByRole("button", {
      name: /Cor forte/,
    });
    expect(within(group).getAllByRole("button")).toHaveLength(4);
    const before = genBodies.length;
    await user.click(chip);
    expect(screen.getByRole("textbox")).toHaveValue("Use uma cor mais forte.");
    expect(genBodies).toHaveLength(before);
  });

  it("falls back to fixed chips silently when /api/suggest fails", async () => {
    suggestFails = true;
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    const group = screen.getByRole("group", { name: "Sugestões de refinamento" });
    for (const label of [
      "Modo escuro",
      "Mais espaçamento",
      "Adicionar ícone",
      "Animação no hover",
    ]) {
      expect(
        await within(group).findByRole("button", {
          name: new RegExp(`^${label}`),
        }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("too-large base: shows the message, Novo componente, and never refines", async () => {
    baseOverride = `export default function Big() { return null }\n// ${"a".repeat(MAX_CODE_LENGTH + 100)}\n`;
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    await refine(user, "azul");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(CODE_TOO_LARGE_MESSAGE);
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
    expect(genBodies).toHaveLength(1);

    const banner = alert.parentElement as HTMLElement;
    await userEvent
      .setup()
      .click(within(banner).getByRole("button", { name: /Novo componente/ }));
    expect(await screen.findByRole("button", { name: "Gerar" })).toBeInTheDocument();
  });
});

const LIST_NAME = "Histórico de versões";

function list() {
  return screen.getByRole("list", { name: LIST_NAME });
}

function suggestCalls() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => url === "/api/suggest").length;
}

describe("turn list", () => {
  it("appears only after the first commit with the current v1 item", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    expect(screen.queryByRole("list", { name: LIST_NAME })).toBeNull();
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(list()).getByRole("button", {
        name: "v1, versão atual: um card. Concluída.",
      }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("restores an earlier version, keeps focus and shows the base notice", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);

    const v1 = within(list()).getByRole("button", {
      name: "Restaurar v1: um card. Concluída.",
    });
    await user.click(v1);

    expect(await screen.findByText("Voltou para v1")).toBeInTheDocument();
    expect(screen.getByTestId("preview")).toHaveAttribute(
      "data-code",
      FIXED_COMPONENT.trim(),
    );
    const current = within(list()).getByRole("button", {
      name: "v1, versão atual: um card. Concluída.",
    });
    expect(current).toBe(v1);
    expect(v1).toHaveFocus();
    expect(
      within(list()).getByRole("button", { name: /^Restaurar v2: azul/ }),
    ).toHaveAccessibleName(/Será descartada ao refinar\.$/);
    expect(
      screen.getByText("Refinar a partir da v1 — v2 será descartada"),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-describedby",
      "refine-base-notice prompt-char-count",
    );
    expect(screen.getByText("v1 · 2 versões")).toBeInTheDocument();
  });

  it("restores a later version forward and clears the notice", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);
    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    await screen.findByText("Voltou para v1");

    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v2: azul. Concluída. Será descartada ao refinar.",
      }),
    );
    expect(await screen.findByText("Foi para v2")).toBeInTheDocument();
    expect(screen.queryByText(/^Refinar a partir da/)).toBeNull();
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-describedby",
      "prompt-char-count",
    );
  });

  it("refining after a restore discards the later versions", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);
    await refine(user, "verde");
    await screen.findByText("Pronto — v3");

    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    expect(
      await screen.findByText(
        "Refinar a partir da v1 — v2 a v3 serão descartadas",
      ),
    ).toBeInTheDocument();

    await refine(user, "mais");
    expect(await screen.findByText("Pronto — v2")).toBeInTheDocument();
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();
    expect(
      within(list()).queryByRole("button", { name: /^Restaurar v3/ }),
    ).toBeNull();
    expect(screen.queryByText(/^Refinar a partir da/)).toBeNull();
  });

  it("hides the preview regenerate after restoring an earlier version (WR-01)", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);
    expect(
      screen.getByRole("button", { name: "Preview: tentar de novo" }),
    ).toBeInTheDocument();

    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    await screen.findByText("Voltou para v1");
    expect(
      screen.queryByRole("button", { name: "Preview: tentar de novo" }),
    ).toBeNull();
    expect(genBodies).toHaveLength(2);
  });

  it("offers the preview regenerate again on the last version and it works as before (WR-01)", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);
    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    await screen.findByText("Voltou para v1");
    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v2: azul. Concluída. Será descartada ao refinar.",
      }),
    );
    await screen.findByText("Foi para v2");

    await user.click(
      screen.getByRole("button", { name: "Preview: tentar de novo" }),
    );
    await waitFor(() => expect(genBodies).toHaveLength(3));
    expect(genBodies[2]).toEqual({
      prompt: "azul",
      currentCode: FIXED_COMPONENT.trim(),
    });
    expect(await screen.findByText("Pronto — v2")).toBeInTheDocument();
    expect(screen.getByText("v2 · 2 versões")).toBeInTheDocument();
  });

  it("hides the preview regenerate at cursor 0 after the cap dropped versions (WR-01)", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");
    for (let i = 2; i <= 21; i++) {
      await refine(user, `r${i}`);
      await screen.findByText(`Pronto — v${i}`);
    }
    expect(
      screen.getByText("Versões mais antigas descartadas (limite de 20)"),
    ).toBeInTheDocument();

    await user.click(
      within(list()).getByRole("button", { name: /^Restaurar v2: r2\./ }),
    );
    await screen.findByText("Voltou para v2");
    expect(
      screen.queryByRole("button", { name: "Preview: tentar de novo" }),
    ).toBeNull();
    expect(genBodies).toHaveLength(21);
  }, 30_000);

  it("scrolls the code panel to the top on restore", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);

    const pre = document.querySelector("#panel-code pre") as HTMLPreElement;
    expect(pre).not.toBeNull();
    pre.scrollTop = 500;
    expect(pre.scrollTop).toBe(500);

    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    await screen.findByText("Voltou para v1");
    await waitFor(() =>
      expect(
        (document.querySelector("#panel-code pre") as HTMLPreElement).scrollTop,
      ).toBe(0),
    );
  });

  it("chips follow the restored version from cache", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");
    const group = () =>
      screen.getByRole("group", { name: "Sugestões de refinamento" });
    await within(group()).findByRole("button", { name: /Cor forte/ });

    await refine(user, "azul");
    await screen.findByText("Pronto — v2");
    await waitFor(() => expect(suggestCalls()).toBe(2));
    await within(group()).findByRole("button", { name: /Cor forte/ });
    const calls = suggestCalls();

    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    await screen.findByText("Voltou para v1");
    expect(
      await within(group()).findByRole("button", { name: /Cor forte/ }),
    ).toBeInTheDocument();
    expect(suggestCalls()).toBe(calls);
  });

  it("shows a gerando row and disables items while streaming", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    behaviors.push("hang");
    await refine(user, "azul");
    await screen.findByText("Refinando…");
    expect(within(list()).getByText("gerando…")).toBeInTheDocument();
    const v1 = within(list()).getByRole("button", {
      name: "v1, versão atual: um card. Concluída.",
    });
    expect(v1).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Parar" }));
    await waitFor(() =>
      expect(within(list()).queryByText("gerando…")).toBeNull(),
    );
    expect(v1).toBeEnabled();
  });

  it("shows an erro row for a failed refine that disappears on retry", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await generateFirst(user);
    await screen.findByText("Pronto — v1");

    behaviors.push("error");
    await refine(user, "azul");
    await screen.findByRole("alert");
    const items = within(list()).getAllByRole("listitem");
    expect(items.some((li) => li.textContent?.includes("Erro: azul"))).toBe(
      true,
    );
    expect(within(list()).getAllByRole("button")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pronto — v2")).toBeInTheDocument();
    expect(within(list()).queryByText(/Erro:/)).toBeNull();
  });

  it("Ctrl+Z on a focused item undoes and keeps focus on it", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);

    const v2 = within(list()).getByRole("button", {
      name: "v2, versão atual: azul. Concluída.",
    });
    v2.focus();
    expect(v2).toHaveFocus();
    await user.keyboard("{Control>}z{/Control}");
    expect(await screen.findByText("Voltou para v1")).toBeInTheDocument();
    expect(v2).toHaveAccessibleName(
      "Restaurar v2: azul. Concluída. Será descartada ao refinar.",
    );
    expect(v2).toHaveFocus();
  });

  it("history disclosure keeps its state and collapses on Novo componente", async () => {
    const user = userEvent.setup();
    render(<GeneratorShell />);
    await twoVersions(user);

    const toggle = screen.getByRole("button", { name: "Histórico (2)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "turn-list-region");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(
      within(list()).getByRole("button", {
        name: "Restaurar v1: um card. Concluída.",
      }),
    );
    await screen.findByText("Voltou para v1");
    expect(
      screen.getByRole("button", { name: "Histórico (2)" }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: /Novo componente/ }));
    await user.click(
      await screen.findByRole("button", { name: "Descartar e começar" }),
    );
    await screen.findByText("Novo componente iniciado");
    await generateFirst(user);
    await screen.findByText("Pronto — v1");
    expect(
      screen.getByRole("button", { name: "Histórico (1)" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
