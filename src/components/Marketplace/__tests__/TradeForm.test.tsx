import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
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
})
