import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionToast } from '../../TransactionToast'

const HASH = 'abcdef0123456789'.repeat(4)

describe('TransactionToast', () => {
  it('announces a successful transaction politely with an explorer link', () => {
    render(
      <TransactionToast
        status="success"
        message="Ship upgrade confirmed"
        hash={HASH}
        network="testnet"
        onDismiss={vi.fn()}
      />
    )

    const toast = screen.getByTestId('transaction-toast')
    expect(toast).toHaveAttribute('role', 'status')
    expect(toast).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Ship upgrade confirmed')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /view transaction/i })
    expect(link).toHaveAttribute('href', `https://stellar.expert/explorer/testnet/tx/${HASH}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('announces failures assertively', () => {
    render(
      <TransactionToast
        status="error"
        message="Upgrade failed: insufficient balance"
        onDismiss={vi.fn()}
      />
    )

    const toast = screen.getByTestId('transaction-toast')
    expect(toast).toHaveAttribute('role', 'alert')
    expect(toast).toHaveAttribute('aria-live', 'assertive')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows a pending toast without an explorer link', () => {
    render(<TransactionToast status="pending" message="Submitting upgrade…" onDismiss={vi.fn()} />)

    expect(screen.getByTestId('transaction-toast')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not render a broken link for an invalid hash', () => {
    render(
      <TransactionToast
        status="success"
        message="Transaction confirmed"
        hash="not-a-hash"
        onDismiss={vi.fn()}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('is dismissible', async () => {
    const onDismiss = vi.fn()
    render(
      <TransactionToast
        status="success"
        message="Transaction confirmed"
        hash={HASH}
        onDismiss={onDismiss}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /dismiss notification/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
