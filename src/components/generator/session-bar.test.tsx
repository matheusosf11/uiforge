import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SessionBar } from "./session-bar"

function setup(props: Partial<React.ComponentProps<typeof SessionBar>> = {}) {
  const onUndo = vi.fn()
  const onNew = vi.fn()
  render(
    <SessionBar
      number={3}
      total={5}
      canUndo
      busy={false}
      onUndo={onUndo}
      onNew={onNew}
      {...props}
    />
  )
  return { onUndo, onNew }
}

describe("SessionBar", () => {
  it("shows position, toolbar and shortcut attribute", () => {
    setup()
    expect(screen.getByText("v3 · 5 versões")).toBeInTheDocument()
    expect(screen.getByRole("toolbar", { name: "Sessão" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Desfazer/ })).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Z Meta+Z"
    )
  })

  it("uses the singular form for a single version", () => {
    setup({ number: 1, total: 1 })
    expect(screen.getByText("v1 · 1 versão")).toBeInTheDocument()
  })

  it("calls handlers on click", async () => {
    const user = userEvent.setup()
    const { onUndo, onNew } = setup()
    await user.click(screen.getByRole("button", { name: /Desfazer/ }))
    await user.click(screen.getByRole("button", { name: /Novo componente/ }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onNew).toHaveBeenCalledTimes(1)
  })

  it("disables Desfazer when !canUndo", () => {
    setup({ canUndo: false })
    expect(screen.getByRole("button", { name: /Desfazer/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Novo componente/ })).toBeEnabled()
  })

  it("disables both when busy", () => {
    setup({ busy: true })
    expect(screen.getByRole("button", { name: /Desfazer/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Novo componente/ })).toBeDisabled()
  })
})
