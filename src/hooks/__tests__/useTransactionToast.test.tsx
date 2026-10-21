import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { useTransactionToast } from '../useTransactionToast'

const toastMock = vi.hoisted(() => ({
  custom: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({ default: toastMock }))

const HASH = 'abcdef0123456789'.repeat(4)

function renderLastCustomToast() {
  const renderer = toastMock.custom.mock.calls.at(-1)?.[0] as (t: { id: string }) => ReactElement
  const options = toastMock.custom.mock.calls.at(-1)?.[1] as { duration?: number }
  const element = renderer({ id: 'custom-toast' })
  render(element)
  return { options, element }
}

describe('useTransactionToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastMock.loading.mockReturnValue('loading-id')
    toastMock.custom.mockReturnValue('custom-id')
  })

  it('shows a loading toast while the transaction is submitted', () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    let id = ''
    act(() => {
      id = result.current.showPending()
    })

    expect(id).toBe('loading-id')
    expect(toastMock.loading).toHaveBeenCalledWith('Submitting transaction…', {
      duration: Infinity,
    })
  })

  it('replaces the pending toast with a success toast linking to the explorer', () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    act(() => {
      result.current.showPending()
    })
    act(() => {
      result.current.showSuccess(HASH, { message: 'Ship upgrade confirmed' })
    })

    expect(toastMock.dismiss).toHaveBeenCalledWith('loading-id')
    expect(toastMock.custom).toHaveBeenCalledOnce()

    const { options } = renderLastCustomToast()
    expect(options.duration).toBe(4000)
    expect(screen.getByText('Ship upgrade confirmed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view transaction/i })).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/tx/${HASH}`
    )
  })

  it('uses the network override when linking a transaction', () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    act(() => {
      result.current.showSuccess(HASH, { network: 'mainnet' })
    })
    renderLastCustomToast()

    expect(screen.getByRole('link', { name: /view transaction/i })).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/public/tx/${HASH}`
    )
  })

  it('shows an accessible failure toast with the error message', () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    act(() => {
      result.current.showError(new Error('insufficient balance'))
    })
    renderLastCustomToast()

    expect(screen.getByText('insufficient balance')).toBeInTheDocument()
    expect(screen.getByTestId('transaction-toast')).toHaveAttribute('role', 'alert')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('supports a custom failure headline', () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    act(() => {
      result.current.showError(new Error('boom'), { message: 'Upgrade failed' })
    })
    renderLastCustomToast()

    expect(screen.getByText('Upgrade failed')).toBeInTheDocument()
  })

  it('dismisses the toast it owns, and only when one is active', () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    act(() => result.current.dismiss())
    expect(toastMock.dismiss).not.toHaveBeenCalled()

    act(() => {
      result.current.showPending()
    })
    act(() => result.current.dismiss())

    expect(toastMock.dismiss).toHaveBeenCalledWith('loading-id')
  })

  it('lets the toast dismiss itself via its button', async () => {
    const { result } = renderHook(() => useTransactionToast('testnet'))

    act(() => {
      result.current.showSuccess(HASH)
    })
    renderLastCustomToast()

    await userEvent.click(screen.getByRole('button', { name: /dismiss notification/i }))

    expect(toastMock.dismiss).toHaveBeenCalledWith('custom-toast')
  })
})
