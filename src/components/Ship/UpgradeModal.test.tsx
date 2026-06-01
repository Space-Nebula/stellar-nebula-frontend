import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ResourceInventory, Ship } from '../../store'
import { render, screen } from '../../test/utils'
import { UpgradeModal } from './UpgradeModal'

const ship: Ship = {
  id: 'aurora',
  name: 'Aurora Wake',
  model: 'Explorer Mk II',
  status: 'docked',
  cargoCapacity: 320,
  crewCapacity: 12,
}

const fundedInventory: ResourceInventory = {
  credits: 4200,
  fuel: 260,
  minerals: 180,
  nebulaDust: 90,
}

describe('UpgradeModal', () => {
  it('renders an accessible dialog with upgrade details', () => {
    render(
      <UpgradeModal
        isOpen
        ship={ship}
        inventory={fundedInventory}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: /upgrade aurora wake/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close upgrade modal/i })).toBeInTheDocument()
    expect(screen.getByText(/ordered operations/i)).toBeInTheDocument()
  })

  it('calls the confirm handler for the selected upgrade', async () => {
    const onConfirm = vi.fn()
    render(
      <UpgradeModal
        isOpen
        ship={ship}
        inventory={fundedInventory}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /deep scan array/i }))
    await userEvent.click(screen.getByRole('button', { name: /apply upgrade/i }))

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 'deep-scan-array' }))
  })

  it('shows pending state and disables confirmation while processing', () => {
    render(
      <UpgradeModal
        isOpen
        ship={ship}
        inventory={fundedInventory}
        isPending
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent(/pending confirmation/i)
    expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled()
  })
})
