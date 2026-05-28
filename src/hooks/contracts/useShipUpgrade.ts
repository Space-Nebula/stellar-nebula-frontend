import { useCallback, useEffect, useMemo, useState } from 'react'
import { TransactionBuilder, rpc } from '@stellar/stellar-sdk'
import { useWallet } from '../../contexts/WalletContext'
import { env } from '../../config/env'
import type { StellarNetworkConfig } from '../../config/stellar'
import { fetchResourceAssetSnapshot, type ResourceAssetSnapshot } from '../../services/assets/resources'
import {
  buildShipUpgradeTransaction,
  calculateUpgradeRequirements,
  calculateUpgradedStats,
  validateUpgrade,
  type ShipUpgradeBuildResult,
  type ShipUpgradeQuote,
  type ShipUpgradeStats,
} from '../../services/contracts/shipUpgrade'
import { fetchShipNFT, type ShipNFTRecord } from '../../services/nft/shipNFT'
import { retryAsync, isRetryableStellarError } from '@utils/stellar/retry'

interface UseShipUpgradeResult {
  shipNFT: ShipNFTRecord | null
  resourceSnapshot: ResourceAssetSnapshot | null
  quote: ShipUpgradeQuote | null
  simulation: ShipUpgradeBuildResult['simulation'] | null
  updatedStats: ShipUpgradeStats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  buildUpgradeTransaction: () => Promise<ShipUpgradeBuildResult | null>
  executeUpgrade: () => Promise<string | null>
}

function inferAccountId(
  accountId: string | null | undefined,
  walletAddress: string | null
): string | null {
  return accountId ?? walletAddress ?? null
}

export function useShipUpgrade(
  shipId: string | null | undefined,
  accountId?: string | null,
  config?: StellarNetworkConfig
): UseShipUpgradeResult {
  const { walletState, signTransaction } = useWallet()
  const resolvedAccountId = useMemo(
    () => inferAccountId(accountId, walletState.publicKey),
    [accountId, walletState.publicKey]
  )

  const [shipNFT, setShipNFT] = useState<ShipNFTRecord | null>(null)
  const [resourceSnapshot, setResourceSnapshot] = useState<ResourceAssetSnapshot | null>(null)
  const [quote, setQuote] = useState<ShipUpgradeQuote | null>(null)
  const [simulation, setSimulation] = useState<ShipUpgradeBuildResult['simulation'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!shipId || !resolvedAccountId) {
      setShipNFT(null)
      setResourceSnapshot(null)
      setQuote(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [nextShip, nextResources] = await Promise.all([
        fetchShipNFT(resolvedAccountId, config, { forceRefresh: true }),
        fetchResourceAssetSnapshot(resolvedAccountId, config, { forceRefresh: true }),
      ])

      setShipNFT(nextShip)
      setResourceSnapshot(nextResources)
      setSimulation(null)

      const requirements = calculateUpgradeRequirements(shipId, nextShip)
      const updatedStats = calculateUpgradedStats(nextShip)
      const validation = validateUpgrade(requirements, nextResources.balances)

      setQuote({
        ...validation,
        updatedStats,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ship upgrade data')
      setQuote(null)
      setShipNFT(null)
      setResourceSnapshot(null)
    } finally {
      setIsLoading(false)
    }
  }, [config, resolvedAccountId, shipId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refresh])

  const buildUpgradeTransaction = useCallback(async () => {
    if (!shipId || !resolvedAccountId) {
      setError('A connected account and ship are required.')
      return null
    }

    try {
      setError(null)
      const nextResources =
        resourceSnapshot ??
        (await fetchResourceAssetSnapshot(resolvedAccountId, config, { forceRefresh: true }))
      const nextShip =
        shipNFT ?? (await fetchShipNFT(resolvedAccountId, config, { forceRefresh: true }))

      setShipNFT(nextShip)
      setResourceSnapshot(nextResources)
      setSimulation(null)

      const result = await buildShipUpgradeTransaction({
        accountId: resolvedAccountId,
        shipId,
        ship: nextShip,
        balances: nextResources.balances,
        config,
      })

      setShipNFT(nextShip)
      setResourceSnapshot(nextResources)
      setQuote(result.quote)
      setSimulation(result.simulation)

      if (result.simulation.status === 'error') {
        const simulationError = result.simulation.error ?? 'Contract simulation failed.'
        setError(simulationError)
        return null
      }

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build upgrade transaction')
      return null
    }
  }, [config, resolvedAccountId, resourceSnapshot, shipId, shipNFT])

  const executeUpgrade = useCallback(async () => {
    if (!walletState.isConnected || !walletState.publicKey) {
      setError('Connect a wallet to submit the upgrade transaction.')
      return null
    }

    const result = await buildUpgradeTransaction()
    if (!result) return null

    try {
      const signedXdr = await signTransaction(result.xdr)
      if (!signedXdr) return null

      const rpcServer = new rpc.Server(config?.rpcUrl ?? env.STELLAR_RPC_URL)
      const transaction = TransactionBuilder.fromXDR(
        signedXdr,
        config?.networkPassphrase ?? env.STELLAR_PASSPHRASE
      )
      const sendResult = await retryAsync(
        async () => rpcServer.sendTransaction(transaction),
        {
          retries: 2,
          shouldRetry: (error) => isRetryableStellarError(error),
        }
      )

      if (sendResult.status !== 'PENDING') {
        throw new Error(`Upgrade submission failed: ${sendResult.status}`)
      }

      const finalResult = await rpcServer.pollTransaction(sendResult.hash)

      if (finalResult.status === 'FAILED') {
        throw new Error('The upgrade transaction failed on-chain.')
      }

      setQuote((current) =>
        current
          ? {
              ...current,
              updatedStats: calculateUpgradedStats(shipNFT),
            }
          : current
      )

      return finalResult.txHash
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit upgrade transaction')
      return null
    }
  }, [buildUpgradeTransaction, config, shipNFT, signTransaction, walletState.isConnected, walletState.publicKey])

  return {
    shipNFT,
    resourceSnapshot,
    quote,
    simulation,
    updatedStats: quote?.updatedStats ?? null,
    isLoading,
    error,
    refresh,
    buildUpgradeTransaction,
    executeUpgrade,
  }
}
