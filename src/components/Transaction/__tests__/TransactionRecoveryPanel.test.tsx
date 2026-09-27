import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '../../../test/utils'
import { TransactionRecoveryPanel } from '../TransactionRecoveryPanel'
import { useTransactionRecovery } from '@/hooks/useTransactionRecovery'
import { useGameStore, initialGameState } from '@/store/gameStore'

/**
 * The recovery surface for a failed transaction (#315).
 *
 * A failed scan rolls back silently today: the state is reverted, the cooldown is
 * taken, and the retry control is rendered nowhere. These tests pin the three
 * actions a user needs, and the rule that matters most — rollback is the only one
 * that frees the cooldown, so a player who retries immediately is not silently
 * rate-limited for a minute.
 */
function seedFailedScan() {
  useGameStore.setState({
    ...initialGameState,
    optimisticOperations: [
      {
        id: 'op-1',
        label: 'Scan sector',
        operation: {
          id: 'op-1',
          type: 'scan',
          targetId: 'neb-1',
          startedAt: new Date(Date.now() - 500).toISOString()
        },
        status: 'failed',
        createdAt: new Date(Date.now() - 500).toISOString(),
        completedAt: new Date().toISOString(),
        error: 'insufficient balance'
      }
    ],
    // Relative to now, so the cooldown is genuinely active whenever the suite
    // runs: a fixed timestamp would silently expire on a later day and the
    // rollback assertions would pass for the wrong reason.
    scanCooldowns: [{ nebulaId: 'neb-1', readyAt: new Date(Date.now() + 60_000).toISOString() }]
  })
}

function Harness({
  submit = vi.fn().mockResolvedValue('ok'),
  canRollback = true
}: {
  submit?: ReturnType<typeof vi.fn>
  canRollback?: boolean
}) {
  const recovery = useTransactionRecovery({ submit, baseDelayMs: 1 })
  return <TransactionRecoveryPanel recovery={recovery} canRollback={canRollback} maxAttempts={3} />
}

describe('TransactionRecoveryPanel', () => {
  beforeEach(() => {
    useGameStore.setState(initialGameState)
  })

  it('renders nothing when there is no failure', () => {
    render(<Harness />)

    expect(screen.queryByRole('region', { name: /transaction recovery/i })).not.toBeInTheDocument()
  })

  it('shows the failure and its error as an alert', () => {
    seedFailedScan()
    render(<Harness />)

    expect(screen.getByRole('region', { name: /transaction recovery/i })).toBeInTheDocument()
    // Announced, not merely visible: a failure that only changes pixels is silent
    // for anyone not watching the panel.
    expect(screen.getByRole('alert')).toHaveTextContent('insufficient balance')
  })

  it('offers a manual rollback that frees the cooldown', async () => {
    const user = userEvent.setup()
    seedFailedScan()
    render(<Harness />)

    expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(true)

    await user.click(screen.getByRole('button', { name: /roll back the failed transaction/i }))

    // The point of a manual rollback: the scan is available again immediately.
    await waitFor(() => {
      expect(useGameStore.getState().isNebulaOnCooldown('neb-1')).toBe(false)
    })
    expect(useGameStore.getState().scanCooldowns).toHaveLength(0)
  })

  it('offers a dismiss that keeps the reverted state and the cooldown', async () => {
    const user = userEvent.setup()
    seedFailedScan()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /dismiss the transaction error/i }))

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /transaction recovery/i })).not.toBeInTheDocument()
    })
    // Dismiss means "stop showing me this", not "undo this".
    expect(useGameStore.getState().scanCooldowns).toHaveLength(1)
  })

  it('hides the rollback control when the caller has nothing to roll back', () => {
    seedFailedScan()
    render(<Harness canRollback={false} />)

    expect(screen.queryByRole('button', { name: /roll back/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss the transaction error/i })).toBeInTheDocument()
  })

  it('re-submits through retry when a preserved frame is supplied', async () => {
    const user = userEvent.setup()
    const submit = vi.fn().mockResolvedValue('ok')
    seedFailedScan()

    function WithFrame() {
      const recovery = useTransactionRecovery({ submit, baseDelayMs: 1 })
      return (
        <TransactionRecoveryPanel
          recovery={recovery}
          maxAttempts={3}
          failure={{
            transactionId: 'tx-1',
            payload: { targetId: 'neb-1' },
            label: 'Scan sector',
            error: 'insufficient balance',
            attempt: 0
          }}
        />
      )
    }

    render(<WithFrame />)

    const retry = screen.getByRole('button', { name: /retry transaction/i })
    await user.click(retry)

    await waitFor(() => {
      expect(submit).toHaveBeenCalled()
    })
  })
})
