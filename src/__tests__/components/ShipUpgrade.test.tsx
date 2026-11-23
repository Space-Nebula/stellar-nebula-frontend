import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { ShipUpgrade } from '@/components/ShipUpgrade'
import { clearFeeCache } from '@/services/stellar/fee-service'
import { calculateTransactionFee, NORMAL_BASE_FEE_STROOPS } from '@/utils/stellar-utils'

describe('ShipUpgrade Component — Fee Display and Calculation', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearFeeCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('displays correct dynamic fee calculation for multi-operation transactions', () => {
    render(<ShipUpgrade operationCount={4} xlmPriceUsd={0.12} />)

    // Formula: 100 stroops * 4 ops = 400 stroops = 0.0000400 XLM
    const expected = calculateTransactionFee(100, 4, 0.12)
    expect(screen.getByTestId('fee-xlm')).toHaveTextContent(expected.totalFeeXlmFormatted)
    expect(screen.getByTestId('fee-formula')).toHaveTextContent('(4 ops × 100 stroops)')
    expect(screen.getByTestId('fee-usd')).toHaveTextContent(expected.totalFeeUsdFormatted)
  })

  it('renders "Estimated fee" label with explanation', () => {
    render(<ShipUpgrade operationCount={4} />)

    expect(screen.getByText('Estimated fee')).toBeInTheDocument()
    expect(
      screen.getByText(/Estimated fee: Final network fee may vary slightly depending on ledger network conditions/i)
    ).toBeInTheDocument()
  })

  it('fetches fee from Horizon /fee_stats before transaction confirmation', async () => {
    const user = userEvent.setup()
    const onConfirmMock = vi.fn()

    const mockStatsResponse = {
      last_ledger_base_fee: '200',
      fee_charged: { mode: '200', p50: '200' },
    }

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStatsResponse,
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<ShipUpgrade operationCount={3} onConfirm={onConfirmMock} />)

    const confirmBtn = screen.getByTestId('confirm-upgrade-button')
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/fee_stats'),
        expect.any(Object)
      )
    })

    await waitFor(() => {
      // 3 ops * 200 stroops = 600 stroops = 0.0000600 XLM
      expect(screen.getByTestId('fee-xlm')).toHaveTextContent('0.0000600 XLM')
      expect(onConfirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFeeStroops: 600,
          operationCount: 3,
        })
      )
    })
  })

  it('displays warning when network fee spikes above 10x normal rate', async () => {
    const user = userEvent.setup()

    // 1500 stroops > 10 * 100 stroops (normal) -> fee spike
    const mockSpikeResponse = {
      last_ledger_base_fee: '1500',
      fee_charged: { mode: '1500', p50: '1500' },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSpikeResponse,
    }) as unknown as typeof fetch

    render(<ShipUpgrade operationCount={2} />)

    const refreshBtn = screen.getByRole('button', { name: /refresh estimated fee/i })
    await user.click(refreshBtn)

    await waitFor(() => {
      expect(screen.getByTestId('fee-spike-warning')).toBeInTheDocument()
      expect(screen.getByText(/Fee Surge Warning/i)).toBeInTheDocument()
    })
  })

  it('caches fee stats for 60 seconds to avoid duplicate network calls', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ last_ledger_base_fee: '120' }),
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<ShipUpgrade operationCount={2} />)

    const refreshBtn = screen.getByRole('button', { name: /refresh estimated fee/i })
    await user.click(refreshBtn)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    // Click confirm button shortly after (within 60s)
    const confirmBtn = screen.getByTestId('confirm-upgrade-button')
    await user.click(confirmBtn)

    // Should NOT call fetch again because 60s cache is active
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
