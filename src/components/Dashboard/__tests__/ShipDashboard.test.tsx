import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, act } from '../../../test/utils'
import { WalletProvider } from '../../../contexts/WalletContext'
import ShipDashboard from '../ShipDashboard'
import {
  useShipStore,
  useResourceStore,
  initialShipState,
  initialResourceState,
} from '../../../store'

vi.mock('@config/env', () => ({
  env: {
    STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
    STELLAR_PASSPHRASE: 'Test SDF Network ; September 2015',
    NEBULA_CONTRACT_ID: 'CTEST',
    TOKEN_CONTRACT_ID: 'CTEST2',
    API_BASE_URL: 'https://api.test',
    SENTRY_DSN: undefined,
  },
}))

// Mock analytics to prevent telemetry calls in tests
vi.mock('../../../services/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
  trackError: vi.fn(),
}))

function renderShipDashboard() {
  return render(
    <WalletProvider>
      <ShipDashboard />
    </WalletProvider>
  )
}

describe('ShipDashboard Optimistic Updates and Rollbacks', () => {
  beforeEach(() => {
    localStorage.clear()
    useShipStore.setState(initialShipState)
    useResourceStore.setState(initialResourceState)
  })

  it('renders default fleet, inventory, and allows opening upgrade bay', async () => {
    renderShipDashboard()

    expect(
      screen.getByRole('heading', { name: /Fleet command, inventory, and upgrades in one place/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Aurora Wake')).toBeInTheDocument()
    expect(screen.getByText('Open upgrade bay')).toBeInTheDocument()
  })

  it('optimistically updates ship and inventory immediately upon applying upgrade', async () => {
    renderShipDashboard()

    const openBayBtn = screen.getByRole('button', { name: /open upgrade bay/i })
    await userEvent.click(openBayBtn)

    // Select Deep Scan Array upgrade
    const deepScanOption = screen.getByRole('button', { name: /deep scan array/i })
    await userEvent.click(deepScanOption)

    const applyBtn = screen.getByRole('button', { name: /apply upgrade/i })
    await userEvent.click(applyBtn)

    // Modal closes and immediate optimistic state is applied
    const auroraShip = screen.getByRole('button', { name: /aurora wake/i })
    expect(auroraShip).toHaveTextContent(/pending/i)

    // Pending transaction banner appears
    expect(screen.getByText(/is pending confirmation/i)).toBeInTheDocument()

    // Wait for the simulated confirmation timer
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 800))
    })

    // After confirmation, pending indicator is removed and success message shown
    expect(screen.getByText(/confirmed successfully/i)).toBeInTheDocument()
  })

  it('rolls back optimistic ship and resource state on failure', () => {
    renderShipDashboard()

    const currentShip = useShipStore.getState().ships[0]
    expect(currentShip).toBeDefined()
    const initialCargo = currentShip.cargoCapacity
    const initialCredits = useResourceStore.getState().inventory.credits

    // Apply optimistic updates directly to verify rollback handling
    let shipTxId = ''
    let resTxId = ''
    act(() => {
      shipTxId = useShipStore
        .getState()
        .applyOptimisticShipUpdate('Upgrade: Cargo Expansion', currentShip.id, {
          cargoCapacity: initialCargo + 100,
        })
      resTxId = useResourceStore.getState().applyOptimisticUpdate('Upgrade: Cargo Expansion', {
        credits: -500,
      })
    })

    expect(useShipStore.getState().ships[0].cargoCapacity).toBe(initialCargo + 100)
    expect(useShipStore.getState().ships[0].isPending).toBe(true)
    expect(useResourceStore.getState().inventory.credits).toBe(initialCredits - 500)

    // Simulate rollback
    act(() => {
      useShipStore
        .getState()
        .rollbackOptimisticShipUpdate(shipTxId, 'Transaction aborted by network')
      useResourceStore
        .getState()
        .rollbackOptimisticUpdate(resTxId, 'Transaction aborted by network')
    })

    expect(useShipStore.getState().ships[0].cargoCapacity).toBe(initialCargo)
    expect(useShipStore.getState().ships[0].isPending).toBe(false)
    expect(useResourceStore.getState().inventory.credits).toBe(initialCredits)
  })
})
