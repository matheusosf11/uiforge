/// <reference types="vitest/globals" />
import { render } from "@testing-library/react";
import { CodeView } from "@/components/generator/code-view";

const CODE_A = "export default function A() {\n  return <div>A</div>;\n}";
const CODE_B = "export default function B() {\n  return <div>B</div>;\n}";

function pre(container: HTMLElement) {
  const el = container.querySelector("pre");
  if (!el) throw new Error("pre not found");
  return el;
}

describe("CodeView scrollResetKey", () => {
  it("scrolls the code to the top when scrollResetKey changes", () => {
    const { container, rerender } = render(
      <CodeView code={CODE_A} scrollResetKey={1} />,
    );
    pre(container).scrollTop = 500;
    rerender(<CodeView code={CODE_B} scrollResetKey={2} />);
    expect(pre(container).scrollTop).toBe(0);
  });

  it("keeps the scroll position when scrollResetKey is unchanged", () => {
    const { container, rerender } = render(
      <CodeView code={CODE_A} scrollResetKey={2} />,
    );
    pre(container).scrollTop = 300;
    rerender(<CodeView code={CODE_B} scrollResetKey={2} />);
    expect(pre(container).scrollTop).toBe(300);
  });

  it("keeps the scroll position when scrollResetKey becomes null", () => {
    const { container, rerender } = render(
      <CodeView code={CODE_A} scrollResetKey={2} />,
    );
    pre(container).scrollTop = 300;
    rerender(<CodeView code={CODE_B} scrollResetKey={null} />);
    expect(pre(container).scrollTop).toBe(300);
  });
});
