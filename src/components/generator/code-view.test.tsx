/// <reference types="vitest/globals" />
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { themes } from "prism-react-renderer";
import { CodeView } from "@/components/generator/code-view";
import { componentFilename } from "@/lib/download-filename";

const theme = vi.hoisted(() => ({ resolvedTheme: "dark" as string | undefined }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: theme.resolvedTheme }),
}));

const CODE_A = "export default function A() {\n  return <div>A</div>;\n}";
const CODE_B = "export default function B() {\n  return <div>B</div>;\n}";
const DRAFT = "export default function Draft() {\n  return <p>rascunho</p>;\n}";

function scroller() {
  return screen.getByTestId("code-scroll");
}

function editor() {
  return screen.getByRole("textbox", { name: "Editor de código" });
}

const ctrlZ = (el: HTMLElement) =>
  fireEvent.keyDown(el, { key: "z", keyCode: 90, ctrlKey: true });

/** Controlled host: the value accumulates and every change reaches the spy. */
function Harness({
  initial,
  spy,
  readOnly,
  dirty,
  onDiscard,
  historyKey,
  after = false,
}: {
  initial: string;
  spy: (code: string) => void;
  readOnly?: boolean;
  dirty?: boolean;
  onDiscard?: () => void;
  historyKey?: string | number | null;
  after?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <CodeView
        code={value}
        onChange={(next) => {
          setValue(next);
          spy(next);
        }}
        readOnly={readOnly}
        dirty={dirty}
        onDiscard={onDiscard}
        historyKey={historyKey}
      />
      {after ? <button type="button">depois</button> : null}
    </>
  );
}

beforeEach(() => {
  theme.resolvedTheme = "dark";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CodeView scrollResetKey", () => {
  it("scrolls the code to the top when scrollResetKey changes", () => {
    const { rerender } = render(<CodeView code={CODE_A} scrollResetKey={1} />);
    scroller().scrollTop = 500;
    rerender(<CodeView code={CODE_B} scrollResetKey={2} />);
    expect(scroller().scrollTop).toBe(0);
  });

  it("keeps the scroll position when scrollResetKey is unchanged", () => {
    const { rerender } = render(<CodeView code={CODE_A} scrollResetKey={2} />);
    scroller().scrollTop = 300;
    rerender(<CodeView code={CODE_B} scrollResetKey={2} />);
    expect(scroller().scrollTop).toBe(300);
  });

  it("keeps the scroll position when scrollResetKey becomes null", () => {
    const { rerender } = render(<CodeView code={CODE_A} scrollResetKey={2} />);
    scroller().scrollTop = 300;
    rerender(<CodeView code={CODE_B} scrollResetKey={null} />);
    expect(scroller().scrollTop).toBe(300);
  });

  it("resets the scroll when a composite string key changes", () => {
    const { rerender } = render(
      <CodeView code={CODE_A} scrollResetKey="1:2:0" />,
    );
    scroller().scrollTop = 400;
    rerender(<CodeView code={CODE_B} scrollResetKey="1:3:0" />);
    expect(scroller().scrollTop).toBe(0);
  });
});

describe("CodeView labelling and look", () => {
  it("labels the section, the editor and links the exit hint", () => {
    render(<CodeView code={CODE_A} />);
    expect(screen.getByRole("heading", { name: "Código" })).toHaveTextContent(
      /^Código$/,
    );
    expect(screen.getByRole("region", { name: "Código" })).toBeInTheDocument();
    expect(editor()).toHaveAccessibleDescription("Esc e depois Tab para sair");
    expect(screen.getByText("Esc e depois Tab para sair")).toBeVisible();
  });

  it("highlights the code with token spans", () => {
    render(<CodeView code={CODE_A} />);
    const pre = scroller().querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre!.querySelectorAll("span").length).toBeGreaterThan(1);
    expect(pre!.textContent).toContain("export default function A()");
    expect(editor()).toHaveValue(CODE_A);
  });

  it("uses nightOwl by default and nightOwlLight in the light theme", () => {
    const { unmount } = render(<CodeView code={CODE_A} />);
    expect(scroller()).toHaveStyle({
      backgroundColor: themes.nightOwl.plain.backgroundColor,
    });
    unmount();

    theme.resolvedTheme = "light";
    render(<CodeView code={CODE_A} />);
    expect(scroller()).toHaveStyle({
      backgroundColor: themes.nightOwlLight.plain.backgroundColor,
    });
  });

  it("shows the placeholder and no editor when empty and read-only", () => {
    render(<CodeView code="" />);
    expect(screen.getByText("O código gerado aparecerá aqui.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText("Esc e depois Tab para sair")).toBeNull();
  });
});

describe("CodeView editing and keyboard", () => {
  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="abc" spy={spy} />);
    await user.click(editor());
    await user.keyboard("{End}X");
    expect(spy).toHaveBeenLastCalledWith("abcX");
    expect(editor()).toHaveValue("abcX");
  });

  it("indents with Tab and unindents with Shift+Tab, keeping focus", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { unmount } = render(<Harness initial="abc" spy={spy} />);
    await user.click(editor());
    await user.keyboard("{End}{Tab}");
    expect(spy).toHaveBeenLastCalledWith("abc  ");
    expect(editor()).toHaveFocus();
    unmount();

    spy.mockClear();
    render(<Harness initial="  abc" spy={spy} />);
    await user.click(editor());
    await user.keyboard("{End}{Shift>}{Tab}{/Shift}");
    expect(spy).toHaveBeenLastCalledWith("abc");
    expect(editor()).toHaveFocus();
  });

  it("Escape then Tab leaves the editor without editing", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="abc" spy={spy} after />);
    await user.click(editor());
    await user.keyboard("{Escape}{Tab}");
    expect(screen.getByRole("button", { name: "depois" })).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
    expect(editor()).toHaveValue("abc");
  });

  it("Escape then Shift+Tab moves focus to Baixar", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="abc" spy={spy} after />);
    await user.click(editor());
    await user.keyboard("{Escape}{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Baixar" })).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
  });

  it("another key after Escape leaves exit mode", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="abc" spy={spy} after />);
    await user.click(editor());
    await user.keyboard("{End}{Escape}a{Tab}");
    expect(spy).toHaveBeenLastCalledWith("abca  ");
    expect(editor()).toHaveFocus();
  });

  it("blur and refocus resets exit mode", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="abc" spy={spy} after />);
    await user.click(editor());
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "depois" }));
    await user.click(editor());
    await user.keyboard("{End}{Tab}");
    expect(spy).toHaveBeenLastCalledWith("abc  ");
    expect(editor()).toHaveFocus();
  });

  it("prevents the default of Escape while editable, keeping focus and text", () => {
    const spy = vi.fn();
    render(<Harness initial="abc" spy={spy} />);
    const ta = editor();
    act(() => ta.focus());
    expect(fireEvent.keyDown(ta, { key: "Escape" })).toBe(false);
    expect(ta).toHaveFocus();
    expect(ta).toHaveValue("abc");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("CodeView read-only lock", () => {
  const RO_CODE = "  ab  ";

  it("never changes the value while read-only", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial={RO_CODE} spy={spy} readOnly />);
    const ta = editor() as HTMLTextAreaElement;
    await user.click(ta);
    await user.keyboard("{End}x");
    await user.keyboard("{End}{Enter}");
    await user.keyboard("{End}{Backspace}");
    act(() => ta.setSelectionRange(0, RO_CODE.length));
    fireEvent.keyDown(ta, { key: "(", keyCode: 57, shiftKey: true });
    ctrlZ(ta);
    expect(spy).not.toHaveBeenCalled();
    expect(ta).toHaveValue(RO_CODE);
  });

  it("blocks the editor's own undo once it becomes read-only", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    const { rerender } = render(<Harness initial="abc" spy={spy} />);
    await user.click(editor());
    await user.keyboard("{End}x");
    expect(editor()).toHaveValue("abcx");
    spy.mockClear();
    rerender(<Harness initial="abc" spy={spy} readOnly />);
    ctrlZ(editor());
    expect(spy).not.toHaveBeenCalled();
    expect(editor()).toHaveValue("abcx");
  });

  it("does not trap Tab and never intercepts Tab or Ctrl+C", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial={RO_CODE} spy={spy} readOnly after />);
    await user.click(editor());
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "depois" })).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();

    const ta = editor();
    expect(fireEvent.keyDown(ta, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(ta, { key: "Tab", shiftKey: true })).toBe(true);
    expect(
      fireEvent.keyDown(ta, { key: "c", keyCode: 67, ctrlKey: true }),
    ).toBe(true);
  });

  it("Escape keeps focus in the read-only editor and Tab still leaves (WR-02)", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial={RO_CODE} spy={spy} readOnly after />);
    const ta = editor();
    await user.click(ta);
    expect(fireEvent.keyDown(ta, { key: "Escape" })).toBe(false);
    await user.keyboard("{Escape}");
    expect(ta).toHaveFocus();
    expect(ta).toHaveValue(RO_CODE);
    await user.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "depois" })).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
  });

  it("stays mounted and focused when a run starts with empty code (WR-03)", () => {
    const { rerender } = render(<CodeView code={CODE_A} onChange={() => {}} />);
    const ta = editor();
    act(() => ta.focus());
    rerender(<CodeView code="" onChange={() => {}} busy readOnly />);
    expect(editor()).toBe(ta);
    expect(ta).toHaveFocus();
    expect(ta).toHaveAttribute("readonly");
    expect(screen.getByText("Esc e depois Tab para sair")).toBeInTheDocument();
    expect(screen.queryByText("O código gerado aparecerá aqui.")).toBeNull();
  });

  it("is read-only by default without onChange", () => {
    render(<CodeView code={CODE_A} />);
    expect(editor()).toHaveAttribute("readonly");
  });
});

describe("CodeView draft header", () => {
  it("shows Editado and Descartar edições; discard focuses the editor", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(
      <Harness initial={DRAFT} spy={vi.fn()} dirty onDiscard={onDiscard} />,
    );
    expect(screen.getByText("Editado")).toBeInTheDocument();
    const buttons = screen
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(buttons).toEqual(["Descartar edições", "Copiar", "Baixar"]);

    await user.click(screen.getByRole("button", { name: "Descartar edições" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(editor()).toHaveFocus());
  });

  it("hides the draft controls when read-only or clean", () => {
    const { rerender } = render(
      <CodeView code={DRAFT} dirty onDiscard={vi.fn()} readOnly />,
    );
    expect(screen.queryByText("Editado")).toBeNull();
    expect(screen.queryByRole("button", { name: "Descartar edições" })).toBeNull();

    rerender(
      <CodeView code={DRAFT} onChange={vi.fn()} dirty={false} onDiscard={vi.fn()} />,
    );
    expect(screen.queryByText("Editado")).toBeNull();
    expect(screen.queryByRole("button", { name: "Descartar edições" })).toBeNull();
  });
});

describe("CodeView export", () => {
  it("copies exactly the shown value", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CodeView code={DRAFT} onChange={vi.fn()} dirty />);
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(writeText).toHaveBeenCalledWith(DRAFT);
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });

  it("shows the failure label and selects the editor when copy fails", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CodeView code={DRAFT} />);
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(
      await screen.findByRole("button", { name: "Não foi possível copiar" }),
    ).toBeInTheDocument();
    const ta = editor() as HTMLTextAreaElement;
    expect(ta).toHaveFocus();
    expect(ta.selectionStart).toBe(0);
    expect(ta.selectionEnd).toBe(DRAFT.length);
  });

  it("downloads the shown value with its component filename", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeObjectURL,
      configurable: true,
    });
    let downloaded = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        downloaded = this.download;
      },
    );
    render(<CodeView code={DRAFT} onChange={vi.fn()} dirty />);
    await user.click(screen.getByRole("button", { name: "Baixar" }));
    expect(downloaded).toBe(componentFilename(DRAFT));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls[0] as unknown[])[0] as Blob;
    expect(await blob.text()).toBe(DRAFT);
  });
});

describe("CodeView history reset", () => {
  it("Ctrl+Z after a historyKey change never resurrects the old text", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();

    function Switcher({ code, k }: { code: string; k: number }) {
      return <CodeView code={code} onChange={spy} historyKey={k} />;
    }

    function Host() {
      const [state, setState] = useState({ code: "base", k: 1 });
      return (
        <>
          <Switcher code={state.code} k={state.k} />
          <button
            type="button"
            onClick={() => setState({ code: "OTHER VERSION", k: 2 })}
          >
            trocar
          </button>
        </>
      );
    }

    // The host never applies edits, so the library history keeps "basez"
    // while the value stays on the base.
    render(<Host />);
    await user.click(editor());
    await user.keyboard("{End}z");
    expect(spy).toHaveBeenLastCalledWith("basez");
    spy.mockClear();
    await user.click(screen.getByRole("button", { name: "trocar" }));
    expect(editor()).toHaveValue("OTHER VERSION");
    ctrlZ(editor());
    expect(spy).not.toHaveBeenCalledWith("base");
    expect(spy).not.toHaveBeenCalled();
  });
});
