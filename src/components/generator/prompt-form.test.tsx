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
});
