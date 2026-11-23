import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { TradeForm } from '../TradeForm'
import { SUPPORTED_ASSETS } from '../types'

const [xlm, dust] = SUPPORTED_ASSETS

function renderForm(onSubmit = vi.fn(), maxAmount?: number) {
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

describe('TradeForm validation', () => {
  it('blocks submit and shows accessible errors when amount is empty', async () => {
    const onSubmit = renderForm()

    await userEvent.click(screen.getByRole('button', { name: /place buy order/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    const alert = await screen.findByText(/enter an amount/i)
    expect(alert).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText(/amount/i)).toHaveAttribute('aria-invalid', 'true')
  })

  it('gives real-time feedback after a field is touched', async () => {
    renderForm()
    const amount = screen.getByLabelText(/amount/i)

    await userEvent.type(amount, '-5')
    await userEvent.tab()
    expect(await screen.findByText(/greater than zero/i)).toBeInTheDocument()

    await userEvent.clear(amount)
    await userEvent.type(amount, '10')
    expect(screen.queryByText(/greater than zero/i)).not.toBeInTheDocument()
    expect(amount).toHaveAttribute('aria-invalid', 'false')
  })

  it('rejects an amount above the available balance', async () => {
    const onSubmit = renderForm(vi.fn(), 50)

    await userEvent.type(screen.getByLabelText(/amount/i), '100')
    await userEvent.click(screen.getByRole('button', { name: /place buy order/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/cannot exceed your balance of 50/i)).toBeInTheDocument()
  })

  it('rejects too many decimal places', async () => {
    const onSubmit = renderForm(vi.fn())

    await userEvent.type(screen.getByLabelText(/amount/i), '1.123456789')
    await userEvent.click(screen.getByRole('button', { name: /place buy order/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/decimal place/i)).toBeInTheDocument()
  })

  it('submits parsed numbers when the form is valid and clears the amount', async () => {
    const onSubmit = renderForm(vi.fn(), 100)

    await userEvent.type(screen.getByLabelText(/amount/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /place buy order/i }))

    expect(onSubmit).toHaveBeenCalledWith('buy', 0.05, 20)
    expect(screen.getByLabelText(/amount/i)).toHaveValue(null)
  })

  it('fills the amount from the MAX shortcut', async () => {
    renderForm(vi.fn(), 75)

    await userEvent.click(screen.getByRole('button', { name: 'MAX' }))
    expect(screen.getByLabelText(/amount/i)).toHaveValue(75)
  })

  it('enforces minimum trade amount of 0.0000001 XLM', async () => {
    const onSubmit = renderForm(vi.fn(), 100)
    const amount = screen.getByLabelText(/amount/i)

    await userEvent.type(amount, '0.00000001')
    await userEvent.tab()

    expect(await screen.findByText(/minimum trade amount is 0.0000001/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /place buy order/i })
    expect(submitBtn).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('handles scientific notation input properly', async () => {
    const onSubmit = renderForm(vi.fn(), 100)
    const amount = screen.getByLabelText(/amount/i)

    // 1e-5 is 0.00001 which has 5 decimals and >= 0.0000001
    await userEvent.type(amount, '1e-5')
    await userEvent.tab()

    expect(screen.queryByText(/decimal place/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/minimum trade amount/i)).not.toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /place buy order/i })
    expect(submitBtn).not.toBeDisabled()

    await userEvent.click(submitBtn)
    expect(onSubmit).toHaveBeenCalledWith('buy', 0.05, 0.00001)
  })

  it('disables submit button and shows error when amount exceeds balance', async () => {
    renderForm(vi.fn(), 25)
    const amount = screen.getByLabelText(/amount/i)

    await userEvent.type(amount, '30')
    await userEvent.tab()

    expect(await screen.findByText(/cannot exceed your balance of 25/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /place buy order/i })
    expect(submitBtn).toBeDisabled()
  })

  it('displays real-time balance in the form header', () => {
    renderForm(vi.fn(), 50)
    expect(screen.getByText(/balance:/i)).toBeInTheDocument()
    expect(screen.getByText(/50 DUST/i)).toBeInTheDocument()
  })
})
