/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import { CodeView } from "@/components/generator/code-view";

const CODE_A = "export default function A() {\n  return <div>A</div>;\n}";
const CODE_B = "export default function B() {\n  return <div>B</div>;\n}";

function scroller() {
  return screen.getByTestId("code-scroll");
}

describe("CodeView scrollResetKey", () => {
  it("scrolls the code to the top when scrollResetKey changes", () => {
    const { rerender } = render(
      <CodeView code={CODE_A} scrollResetKey={1} />,
    );
    scroller().scrollTop = 500;
    rerender(<CodeView code={CODE_B} scrollResetKey={2} />);
    expect(scroller().scrollTop).toBe(0);
  });

  it("keeps the scroll position when scrollResetKey is unchanged", () => {
    const { rerender } = render(
      <CodeView code={CODE_A} scrollResetKey={2} />,
    );
    scroller().scrollTop = 300;
    rerender(<CodeView code={CODE_B} scrollResetKey={2} />);
    expect(scroller().scrollTop).toBe(300);
  });

  it("keeps the scroll position when scrollResetKey becomes null", () => {
    const { rerender } = render(
      <CodeView code={CODE_A} scrollResetKey={2} />,
    );
    scroller().scrollTop = 300;
    rerender(<CodeView code={CODE_B} scrollResetKey={null} />);
    expect(scroller().scrollTop).toBe(300);
  });
});
