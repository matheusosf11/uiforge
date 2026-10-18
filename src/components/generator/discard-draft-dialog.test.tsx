import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DiscardDraftDialog } from "./discard-draft-dialog"

function Harness({
  onConfirm,
  onOpenChange,
}: {
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  const [open, setOpen] = React.useState(true)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  return (
    <>
      <button type="button" ref={triggerRef}>
        v3
      </button>
      <DiscardDraftDialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          setOpen(next)
        }}
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
        baseNumber={1}
        targetNumber={3}
        finalFocusRef={triggerRef}
      />
    </>
  )
}

function setup() {
  const onConfirm = vi.fn()
  const onOpenChange = vi.fn()
  render(<Harness onConfirm={onConfirm} onOpenChange={onOpenChange} />)
  return { onConfirm, onOpenChange }
}

describe("DiscardDraftDialog", () => {
  it("renders the alertdialog with title, description and actions", () => {
    setup()
    expect(
      screen.getByRole("alertdialog", { name: "Descartar edições?" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Você tem edições na v1. Ir para a v3 descarta essas edições."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Cancelar")).toBeInTheDocument()
    expect(screen.getByText("Descartar edições e ir")).toBeInTheDocument()
  })

  it("focuses Cancelar initially", async () => {
    setup()
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus()
    )
  })

  it("confirm calls onConfirm once and returns focus to the trigger", async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()
    await user.click(screen.getByText("Descartar edições e ir"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "v3" })).toHaveFocus()
    )
  })

  it("Cancelar closes without confirming and returns focus", async () => {
    const user = userEvent.setup()
    const { onConfirm, onOpenChange } = setup()
    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
    expect(onConfirm).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "v3" })).toHaveFocus()
    )
  })

  it("Esc closes without confirming and returns focus", async () => {
    const user = userEvent.setup()
    const { onConfirm, onOpenChange } = setup()
    await user.keyboard("{Escape}")
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
    expect(onConfirm).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "v3" })).toHaveFocus()
    )
  })
})
