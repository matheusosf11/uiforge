import { fireEvent, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { useUndoShortcut } from "./use-undo-shortcut"

function Harness({
  enabled = true,
  dialogOpen = false,
  onUndo,
  withAlert = false,
}: {
  enabled?: boolean
  dialogOpen?: boolean
  onUndo: () => void
  withAlert?: boolean
}) {
  useUndoShortcut({ enabled, dialogOpen, onUndo })
  return (
    <div>
      <textarea aria-label="prompt" />
      {withAlert ? <div role="alertdialog" /> : null}
    </div>
  )
}

describe("useUndoShortcut", () => {
  it("undoes on Ctrl+Z at body and prevents default", () => {
    const onUndo = vi.fn()
    render(<Harness onUndo={onUndo} />)
    const notCancelled = fireEvent.keyDown(document.body, {
      key: "z",
      ctrlKey: true,
    })
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(notCancelled).toBe(false)
  })

  it("undoes on Meta+Z", () => {
    const onUndo = vi.fn()
    render(<Harness onUndo={onUndo} />)
    fireEvent.keyDown(document.body, { key: "z", metaKey: true })
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it("ignores Ctrl+Y / Ctrl+W on the physical KeyZ (QWERTZ / AZERTY)", () => {
    const onUndo = vi.fn()
    render(<Harness onUndo={onUndo} />)
    const y = fireEvent.keyDown(document.body, {
      key: "y",
      code: "KeyZ",
      ctrlKey: true,
    })
    const w = fireEvent.keyDown(document.body, {
      key: "w",
      code: "KeyZ",
      ctrlKey: true,
    })
    expect(onUndo).not.toHaveBeenCalled()
    expect(y).toBe(true)
    expect(w).toBe(true)
  })

  it("undoes on logical z from another physical key, and on KeyZ with a non-printable key", () => {
    const onUndo = vi.fn()
    render(<Harness onUndo={onUndo} />)
    fireEvent.keyDown(document.body, { key: "z", code: "KeyY", ctrlKey: true })
    fireEvent.keyDown(document.body, { key: "Z", code: "KeyY", ctrlKey: true })
    fireEvent.keyDown(document.body, {
      key: "Process",
      code: "KeyZ",
      ctrlKey: true,
    })
    expect(onUndo).toHaveBeenCalledTimes(3)
  })

  it("ignores Ctrl+Z inside a textarea", async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    const { getByLabelText } = render(<Harness onUndo={onUndo} />)
    await user.click(getByLabelText("prompt"))
    await user.keyboard("{Control>}z{/Control}")
    expect(onUndo).not.toHaveBeenCalled()
  })

  it("ignores Shift/Alt, repeat, disabled, dialogOpen and alertdialog", () => {
    const onUndo = vi.fn()
    const { rerender } = render(<Harness onUndo={onUndo} />)
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true, shiftKey: true })
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true, altKey: true })
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true, repeat: true })
    rerender(<Harness onUndo={onUndo} enabled={false} />)
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })
    rerender(<Harness onUndo={onUndo} dialogOpen />)
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })
    rerender(<Harness onUndo={onUndo} withAlert />)
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })
    expect(onUndo).not.toHaveBeenCalled()
  })
})
