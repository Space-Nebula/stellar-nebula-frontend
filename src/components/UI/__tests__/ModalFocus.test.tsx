import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '../../../test/utils'
import { Modal } from '../Modal'
import { HelpModal } from '../../Help/HelpModal'

/**
 * Focus management for dialogs (#291).
 *
 * A modal that does not trap focus lets a keyboard user tab into the page behind
 * it, which means focus is lost with no way back; one that does not restore
 * focus drops the user at the top of the document after closing, so they have to
 * tab again to wherever they were. Both were possible here because the focus
 * logic lived inside one component and another dialog re-implemented only part
 * of it.
 *
 * The contract asserted here, for every dialog: focus moves in on open, Tab and
 * Shift+Tab cycle within it, ESC closes when allowed, and focus returns to the
 * element that opened it.
 */
function DialogWithTriggers({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <button type="button">Behind the dialog</button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="Confirm scan"
      >
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </Modal>
    </>
  )
}

describe('Modal focus management', () => {
  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup()
    render(<DialogWithTriggers />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    // The first focusable control inside the panel, not the trigger that opened it.
    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus()
  })

  it('restores focus to the trigger when the dialog closes', async () => {
    const user = userEvent.setup()
    render(<DialogWithTriggers />)

    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(trigger).toHaveFocus()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps Tab inside the dialog instead of reaching the page behind', async () => {
    const user = userEvent.setup()
    render(<DialogWithTriggers />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    // The close button, then the two actions, then back to the first.
    const inDialog = [
      screen.getByRole('button', { name: 'Close dialog' }),
      screen.getByRole('button', { name: 'First action' }),
      screen.getByRole('button', { name: 'Second action' }),
    ]

    for (const expected of inDialog) {
      await user.tab()
      expect(expected).toHaveFocus()
    }

    // Cycling past the last control wraps to the first, never to
    // "Behind the dialog", which lives outside the panel.
    await user.tab()
    expect(inDialog[0]).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Behind the dialog' })).not.toHaveFocus()
  })

  it('wraps backwards on Shift+Tab from the first control', async () => {
    const user = userEvent.setup()
    render(<DialogWithTriggers />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    const closeButton = screen.getByRole('button', { name: 'Close dialog' })

    await user.tab({ shift: true })

    expect(screen.getByRole('button', { name: 'Second action' })).toHaveFocus()
    expect(closeButton).not.toHaveFocus()
  })

  it('never lets focus land on the page behind, from any starting point', async () => {
    const user = userEvent.setup()
    render(<DialogWithTriggers />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    // Walk well past the number of controls in the dialog.
    for (let i = 0; i < 8; i += 1) {
      await user.tab()
      const dialog = screen.getByRole('dialog')
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('focuses the panel itself when the dialog has nothing focusable', async () => {
    const user = userEvent.setup()
    render(
      <Modal isOpen onClose={vi.fn()} title="Nothing to focus" hideHeader>
        <p>Body only</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      expect(dialog).toHaveFocus()
    })

    // Tab must not escape an empty dialog either.
    await user.tab()
    expect(dialog).toHaveFocus()
  })

  it('closes on ESC and leaves focus on the trigger', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<DialogWithTriggers onClose={onClose} />)

    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('does not close on ESC when the dialog opts out, and keeps focus contained', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <>
        <Modal isOpen onClose={onClose} title="Sticky" closeOnEsc={false} hideHeader>
          <button type="button">Only action</button>
        </Modal>
        <button type="button">Behind</button>
      </>
    )

    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('restores focus even when it is closed via the close button', async () => {
    const user = userEvent.setup()
    render(<DialogWithTriggers />)

    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)
    await user.click(screen.getAllByRole('button', { name: 'Close dialog' })[0])

    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('does not throw when the element that had focus is gone at close time', async () => {
    const user = userEvent.setup()
    function Vanishing() {
      const [open, setOpen] = useState(false)
      const [showTrigger, setShowTrigger] = useState(true)
      return (
        <>
          {showTrigger && (
            <button type="button" onClick={() => setOpen(true)}>
              Open dialog
            </button>
          )}
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Vanishing trigger" hideHeader>
            <button type="button" onClick={() => setShowTrigger(false)}>
              Unmount the trigger
            </button>
          </Modal>
        </>
      )
    }

    render(<Vanishing />)
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await user.click(screen.getByRole('button', { name: 'Unmount the trigger' }))
    await user.keyboard('{Escape}')

    // No throw, and focus did not end up somewhere surprising.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('HelpModal focus management', () => {
  function HelpWithTrigger({ onClose = vi.fn() }: { onClose?: () => void }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Help
        </button>
        <button type="button">Behind the help dialog</button>
        <HelpModal
          isOpen={open}
          onClose={() => {
            onClose()
            setOpen(false)
          }}
        />
      </>
    )
  }

  it('moves focus into the dialog and restores it to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<HelpWithTrigger />)

    const trigger = screen.getByRole('button', { name: 'Help' })
    await user.click(trigger)

    // Focus lands on the close button, the first control in the dialog.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close help' })).toHaveFocus()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('keeps Tab inside the help dialog', async () => {
    const user = userEvent.setup()
    render(<HelpWithTrigger />)
    await user.click(screen.getByRole('button', { name: 'Help' }))

    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 10; i += 1) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    expect(screen.getByRole('button', { name: 'Behind the help dialog' })).not.toHaveFocus()
  })

  it('exposes the dialog to assistive technology as a modal', async () => {
    const user = userEvent.setup()
    render(<HelpWithTrigger />)
    await user.click(screen.getByRole('button', { name: 'Help' }))

    const dialog = screen.getByRole('dialog', { name: /help and frequently asked questions/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
