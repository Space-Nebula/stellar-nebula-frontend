import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { TradeForm } from '@/components/TradeForm'
import { SUPPORTED_ASSETS } from '@/components/Marketplace/types'

const [xlm, dust] = SUPPORTED_ASSETS

function renderForm(onSubmit = vi.fn(), maxAmount = 100) {
  render(
    <TradeForm
      baseAsset={dust}
      quoteAsset={xlm}
      currentPrice={0.05}
      maxAmount={maxAmount}
      onSubmit={onSubmit}
    />
  )
  return onSubmit
}

describe('TradeForm DEX Amount Validation Tests (#552)', () => {
  it('only accepts positive numeric values in the amount field', async () => {
    const onSubmit = renderForm()
    const amountInput = screen.getByLabelText(/amount/i)

    await userEvent.type(amountInput, '-10')
    await userEvent.tab()

    expect(await screen.findByText(/greater than zero/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place buy order/i })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects amounts exceeding available user balance and disables submit button', async () => {
    renderForm(vi.fn(), 50)
    const amountInput = screen.getByLabelText(/amount/i)

    await userEvent.type(amountInput, '75')
    await userEvent.tab()

    expect(await screen.findByText(/cannot exceed your balance of 50 DUST/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /place buy order/i })
    expect(submitBtn).toBeDisabled()
  })

  it('limits decimal precision to 7 places (Stellar stroops limit)', async () => {
    renderForm(vi.fn(), 100)
    const amountInput = screen.getByLabelText(/amount/i)

    await userEvent.type(amountInput, '1.12345678')
    await userEvent.tab()

    expect(await screen.findByText(/up to 7 decimal places/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place buy order/i })).toBeDisabled()
  })

  it('enforces minimum trade amount (0.0000001)', async () => {
    renderForm(vi.fn(), 100)
    const amountInput = screen.getByLabelText(/amount/i)

    await userEvent.type(amountInput, '0.00000005')
    await userEvent.tab()

    expect(await screen.findByText(/minimum trade amount is 0.0000001/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place buy order/i })).toBeDisabled()
  })

  it('handles scientific notation input safely (e.g. 1e-5)', async () => {
    const onSubmit = renderForm(vi.fn(), 100)
    const amountInput = screen.getByLabelText(/amount/i)

    await userEvent.type(amountInput, '1e-5')
    await userEvent.tab()

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /place buy order/i })
    expect(submitBtn).not.toBeDisabled()

    await userEvent.click(submitBtn)
    expect(onSubmit).toHaveBeenCalledWith('buy', 0.05, 0.00001)
  })

  it('displays real-time balance in header and updates on input', () => {
    renderForm(vi.fn(), 150)
    expect(screen.getByText(/balance:/i)).toBeInTheDocument()
    expect(screen.getByText(/150 DUST/i)).toBeInTheDocument()
  })
})
