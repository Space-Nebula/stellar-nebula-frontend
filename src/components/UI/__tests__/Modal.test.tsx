import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '../../../test/utils'
import { Modal } from '../Modal'
import { ModalProvider, useModal } from '../../../contexts/ModalContext'

describe('Modal', () => {
  it('renders an accessible dialog labelled by its title', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Confirm trade">
        <p>Body</p>
      </Modal>
    )

    expect(screen.getByRole('dialog', { name: /confirm trade/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden">
        <p>Body</p>
      </Modal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on ESC', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Trade">
        <button type="button">Focusable</button>
      </Modal>
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on ESC when closeOnEsc is false', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Trade" closeOnEsc={false}>
        <button type="button">Focusable</button>
      </Modal>
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on backdrop click but not on panel click', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Trade">
        <button type="button">Focusable</button>
      </Modal>
    )

    await userEvent.click(screen.getByRole('button', { name: /focusable/i }))
    expect(onClose).not.toHaveBeenCalled()

    // The backdrop exposes a dedicated close control behind the panel.
    const backdrop = document.querySelector('.ui-modal-backdrop-close') as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('omits the backdrop close control when closeOnBackdrop is false', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Trade" closeOnBackdrop={false}>
        <p>Body</p>
      </Modal>
    )
    expect(document.querySelector('.ui-modal-backdrop-close')).toBeNull()
  })

  it('closes via the header close button', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Trade">
        <p>Body</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /close dialog/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the trigger when closed', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Trade">
            <button type="button">Inside</button>
          </Modal>
        </>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole('button', { name: /open/i })
    trigger.focus()
    await userEvent.click(trigger)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('locks body scroll while open', () => {
    const { unmount } = render(
      <Modal isOpen onClose={vi.fn()} title="Trade">
        <p>Body</p>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('ModalProvider / useModal', () => {
  function Consumer() {
    const { openModal, closeAll, openModalIds } = useModal()
    return (
      <div>
        <button
          type="button"
          onClick={() => openModal(<p>Centralised body</p>, { title: 'Centralised' })}
        >
          Open centralised
        </button>
        <button type="button" onClick={() => closeAll()}>
          Close all
        </button>
        <span data-testid="count">{openModalIds.length}</span>
      </div>
    )
  }

  it('opens and closes modals through centralised state', async () => {
    render(
      <ModalProvider>
        <Consumer />
      </ModalProvider>
    )

    expect(screen.getByTestId('count')).toHaveTextContent('0')

    await userEvent.click(screen.getByRole('button', { name: /open centralised/i }))
    expect(screen.getByRole('dialog', { name: /centralised/i })).toBeInTheDocument()
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /centralised/i })).not.toBeInTheDocument()
    )
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('supports stacking multiple modals and closing them all', async () => {
    render(
      <ModalProvider>
        <Consumer />
      </ModalProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: /open centralised/i }))
    await userEvent.click(screen.getByRole('button', { name: /open centralised/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('2')

    await userEvent.click(screen.getByRole('button', { name: /close all/i }))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('throws when useModal is used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(/useModal must be used within a ModalProvider/)
    spy.mockRestore()
  })
})
