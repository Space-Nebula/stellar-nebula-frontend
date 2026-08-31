import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { WalletProvider } from '@/contexts/WalletContext'
import { useShipUpgrade } from '../useShipUpgrade'
import type { ShipNFTRecord } from '../../../services/nft/shipNFT'
import type { ResourceAssetSnapshot } from '../../../services/assets/resources'

// ─── Hoisted mock functions (must be before vi.mock factories) ───────────────

const {
  mockFetchShipNFT,
  mockFetchResourceAssetSnapshot,
  mockBuildShipUpgradeTransaction,
  mockCalculateUpgradeRequirements,
  mockCalculateUpgradedStats,
  mockValidateUpgrade,
} = vi.hoisted(() => ({
  mockFetchShipNFT: vi.fn(),
  mockFetchResourceAssetSnapshot: vi.fn(),
  mockBuildShipUpgradeTransaction: vi.fn(),
  mockCalculateUpgradeRequirements: vi.fn(),
  mockCalculateUpgradedStats: vi.fn(),
  mockValidateUpgrade: vi.fn(),
}))

// ─── Module mocks ────────────────────────────────────────────────────────────

// env.ts throws at module load if env vars are missing — mock it first
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

vi.mock('@services/wallets', () => ({
  isFreighterInstalled: vi.fn().mockResolvedValue(false),
  isLedgerAvailable: vi.fn().mockResolvedValue(false),
  connectLedger: vi.fn(),
  signTransactionWithLedger: vi.fn(),
  disconnectLedger: vi.fn(),
  getLedgerNetwork: vi.fn((network: string) => network),
  isWalletConnectAvailable: vi.fn().mockReturnValue(false),
  connectWalletConnect: vi.fn(),
  signTransactionWithWalletConnect: vi.fn(),
  getWalletConnectNetwork: vi.fn(),
  disconnectWalletConnect: vi.fn(),
  loadWalletConnectSession: vi.fn().mockReturnValue(null),
  connectFreighter: vi.fn(),
  getFreighterNetwork: vi.fn(),
  isAlbedoAvailable: vi.fn().mockReturnValue(false),
  connectAlbedo: vi.fn(),
  signTransactionWithFreighter: vi.fn(),
  signTransactionWithAlbedo: vi.fn(),
}))

vi.mock('@/services/monitoring', () => ({
  addMonitoringBreadcrumb: vi.fn(),
  setMonitoringUser: vi.fn(),
  clearMonitoringUser: vi.fn(),
}))

vi.mock('@/services/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/services/logging', () => ({
  createScopedLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('../../../services/nft/shipNFT', () => ({
  fetchShipNFT: mockFetchShipNFT,
}))

vi.mock('../../../services/assets/resources', () => ({
  fetchResourceAssetSnapshot: mockFetchResourceAssetSnapshot,
}))

vi.mock('../../../services/contracts/shipUpgrade', () => ({
  buildShipUpgradeTransaction: mockBuildShipUpgradeTransaction,
  calculateUpgradeRequirements: mockCalculateUpgradeRequirements,
  calculateUpgradedStats: mockCalculateUpgradedStats,
  validateUpgrade: mockValidateUpgrade,
}))

vi.mock('@utils/stellar/retry', () => ({
  retryAsync: vi.fn((fn: () => unknown) => fn()),
  isRetryableStellarError: vi.fn().mockReturnValue(false),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_SHIP_ID = 'ship-001'
const MOCK_ACCOUNT_ID = 'GAHTJRCKMIQWJSLS6OGCHZMAKSDBUQGIT4AJGBE6KCAJBKNNCLSYTRDS'

const MOCK_SHIP: ShipNFTRecord = {
  accountId: MOCK_ACCOUNT_ID,
  assetCode: 'SHIPNFT',
  metadata: {
    name: 'Nebula Drifter',
    tier: '2',
    stats: { hull: 100, shield: 90, speed: 80, cargoCapacity: 120, crewCapacity: 10, tier: 2 },
    attributes: [],
  },
  fetchedAt: new Date().toISOString(),
}

const MOCK_RESOURCES: ResourceAssetSnapshot = {
  accountId: MOCK_ACCOUNT_ID,
  balances: [
    { code: 'XLM', balance: '1000.0000000', assetType: 'native' },
    { code: 'NEBULITE', issuer: 'GISSUER', balance: '500.0000000', assetType: 'credit_alphanum12' },
  ],
  fetchedAt: new Date().toISOString(),
}

const MOCK_REQUIREMENTS = { credits: 100, stardust: 50, nebulite: 20, cosmicDust: 10 }
const MOCK_UPDATED_STATS = {
  hull: 120,
  shield: 110,
  speed: 105,
  cargoCapacity: 150,
  crewCapacity: 12,
}
const MOCK_VALIDATION = { canUpgrade: true, missing: [], requirements: MOCK_REQUIREMENTS }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useShipUpgrade', () => {
  beforeEach(() => {
    mockFetchShipNFT.mockReset()
    mockFetchResourceAssetSnapshot.mockReset()
    mockBuildShipUpgradeTransaction.mockReset()
    mockCalculateUpgradeRequirements.mockReturnValue(MOCK_REQUIREMENTS)
    mockCalculateUpgradedStats.mockReturnValue(MOCK_UPDATED_STATS)
    mockValidateUpgrade.mockReturnValue(MOCK_VALIDATION)
  })

  it('initialises with idle state when no shipId is provided', () => {
    const { result } = renderHook(() => useShipUpgrade(null), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.shipNFT).toBeNull()
    expect(result.current.quote).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('initialises with idle state when no accountId can be resolved', () => {
    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID), { wrapper })

    expect(result.current.shipNFT).toBeNull()
    expect(result.current.quote).toBeNull()
  })

  it('loads ship NFT and resource snapshot on mount with explicit accountId', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.shipNFT).toEqual(MOCK_SHIP))

    expect(result.current.resourceSnapshot).toEqual(MOCK_RESOURCES)
    expect(result.current.quote).not.toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('sets canUpgrade from validation result', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.quote).not.toBeNull())
    expect(result.current.quote?.canUpgrade).toBe(true)
  })

  it('exposes updatedStats from the quote', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.updatedStats).not.toBeNull())
    expect(result.current.updatedStats?.hull).toBe(120)
  })

  it('sets error when fetching ship NFT fails', async () => {
    mockFetchShipNFT.mockRejectedValue(new Error('Horizon unavailable'))
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toBe('Horizon unavailable')
    expect(result.current.shipNFT).toBeNull()
  })

  it('sets error when fetching resource snapshot fails', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockRejectedValue(new Error('Rate limited'))

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.error).toBe('Rate limited')
  })

  it('buildUpgradeTransaction returns null with error when no shipId', async () => {
    const { result } = renderHook(() => useShipUpgrade(null), { wrapper })

    let buildResult: unknown
    await act(async () => {
      buildResult = await result.current.buildUpgradeTransaction()
    })

    expect(buildResult).toBeNull()
    expect(result.current.error).toBeTruthy()
  })

  it('buildUpgradeTransaction calls the service with correct params', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)
    mockBuildShipUpgradeTransaction.mockResolvedValue({
      xdr: 'TXXDR==',
      transaction: {},
      quote: {
        canUpgrade: true,
        missing: [],
        requirements: MOCK_REQUIREMENTS,
        updatedStats: MOCK_UPDATED_STATS,
      },
      simulation: { status: 'success' },
    })

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.buildUpgradeTransaction()
    })

    expect(mockBuildShipUpgradeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: MOCK_ACCOUNT_ID, shipId: MOCK_SHIP_ID })
    )
  })

  it('buildUpgradeTransaction sets error when simulation fails', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)
    mockBuildShipUpgradeTransaction.mockResolvedValue({
      xdr: 'TXXDR==',
      transaction: {},
      quote: {
        canUpgrade: false,
        missing: [],
        requirements: MOCK_REQUIREMENTS,
        updatedStats: MOCK_UPDATED_STATS,
      },
      simulation: { status: 'error', error: 'Insufficient gas' },
    })

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.buildUpgradeTransaction()
    })

    expect(result.current.error).toBe('Insufficient gas')
  })

  it('executeUpgrade returns null when wallet is not connected', async () => {
    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    let execResult: unknown
    await act(async () => {
      execResult = await result.current.executeUpgrade()
    })

    expect(execResult).toBeNull()
  })

  it('refresh re-fetches ship and resources', async () => {
    mockFetchShipNFT.mockResolvedValue(MOCK_SHIP)
    mockFetchResourceAssetSnapshot.mockResolvedValue(MOCK_RESOURCES)

    const { result } = renderHook(() => useShipUpgrade(MOCK_SHIP_ID, MOCK_ACCOUNT_ID), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const callsBefore = (mockFetchShipNFT as Mock).mock.calls.length

    await act(async () => {
      await result.current.refresh()
    })

    expect((mockFetchShipNFT as Mock).mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
