import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialResourceState, useResourceStore } from '../../store'
import { render, screen } from '../../test/utils'
import { Inventory } from './Inventory'

describe('Inventory', () => {
  beforeEach(() => {
    localStorage.clear()
    useResourceStore.setState(initialResourceState)
  })

  it('renders resources and supports filtering and sorting controls', async () => {
    render(
      <Inventory
        inventory={{
          credits: 500,
          fuel: 20,
          minerals: 0,
          nebulaDust: 5,
        }}
      />
    )

    expect(screen.getByRole('heading', { name: /resource inventory/i })).toBeInTheDocument()
    expect(screen.getByText('Credits')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /empty/i }))
    expect(screen.getByText('Minerals')).toBeInTheDocument()
    expect(screen.queryByText('Credits')).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText(/sort/i), 'name')
    expect(screen.getByRole('combobox', { name: /sort/i })).toHaveValue('name')
  })

  it('shows pending optimistic resource deltas', () => {
    useResourceStore.setState({
      ...initialResourceState,
      inventory: {
        credits: 750,
        fuel: 100,
        minerals: 60,
        nebulaDust: 10,
      },
      optimisticTransactions: [
        {
          id: 'tx-1',
          label: 'Upgrade: Cargo',
          changes: { credits: -250, minerals: -20 },
          before: {
            credits: 1000,
            fuel: 100,
            minerals: 80,
            nebulaDust: 10,
          },
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ],
    })

    render(<Inventory />)

    expect(screen.getByText('Pending -250')).toBeInTheDocument()
    expect(screen.getByText('Pending -20')).toBeInTheDocument()
  })
})
