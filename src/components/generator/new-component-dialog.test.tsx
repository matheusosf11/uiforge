import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { NewComponentDialog } from "./new-component-dialog"

function setup(onConfirm = vi.fn()) {
  const onOpenChange = vi.fn()
  render(
    <NewComponentDialog
      open
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  )
  return { onConfirm, onOpenChange }
}

describe("NewComponentDialog", () => {
  it("renders an alertdialog with title and actions", () => {
    setup()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(screen.getByText("Começar um novo componente?")).toBeInTheDocument()
    expect(screen.getByText("Cancelar")).toBeInTheDocument()
    expect(screen.getByText("Começar novo")).toBeInTheDocument()
  })

  it("Esc requests close and does not confirm", async () => {
    const user = userEvent.setup()
    const { onConfirm, onOpenChange } = setup()
    await user.keyboard("{Escape}")
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("confirm button calls onConfirm once", async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    await user.click(screen.getByText("Começar novo"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
