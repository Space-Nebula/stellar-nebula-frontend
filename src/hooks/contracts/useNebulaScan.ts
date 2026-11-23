import { useState, useCallback } from 'react'
import { SorobanContractClient, ContractError } from '@services/contracts'
import { haptics } from '@/utils/haptics'
import { getActiveStellarConfig } from '@/config/stellar'
import { simulateContractTransaction } from '@utils/stellar/simulate'
import type { ParsedSimulationResult, ContractNativeValue } from '@utils/stellar/responseParser'
import type { ScanNebulaParams, ScanNebulaResult } from '@services/contracts'
import { parseStellarError } from '@/utils/stellar-errors'
import type { XDR } from '@/types'

export interface UseNebulaScanOptions {
  contractId: string
  signTransaction: (xdr: XDR) => Promise<XDR | null>
}

export interface UseNebulaScanReturn {
  scan: (nebulaId: string, scannerPublicKey: string) => Promise<ScanNebulaResult | null>
  isLoading: boolean
  error: string | null
  result: ScanNebulaResult | null
  simulation: ParsedSimulationResult<ContractNativeValue> | null
  reset: () => void
}

/**
 * Hook that scans a nebula zone via a Soroban contract.
 *
 * @param options.contractId     - The Soroban contract address
 * @param options.signTransaction- Callback to sign a built XDR
 *
 * @example
 * const { scan, isLoading, error } = useNebulaScan({
 *   contractId: 'C...',
 *   signTransaction: (xdr) => wallet.sign(xdr),
 * })
 */
export function useNebulaScan({
  contractId,
  signTransaction,
}: UseNebulaScanOptions): UseNebulaScanReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanNebulaResult | null>(null)
  const [simulation, setSimulation] = useState<ParsedSimulationResult<ContractNativeValue> | null>(
    null
  )

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
    setSimulation(null)
  }, [])

  const scan = useCallback(
    async (nebulaId: string, scannerPublicKey: string): Promise<ScanNebulaResult | null> => {
      setIsLoading(true)
      setError(null)
      setResult(null)
      setSimulation(null)

      try {
        const config = getActiveStellarConfig()
        const client = new SorobanContractClient(contractId, config)

        const params: ScanNebulaParams = { nebulaId, scannerPublicKey }
        const unsignedXdr = await client.buildScanTransaction(params)

        // Simulate before asking the wallet to sign, so a reverting contract
        // call is caught and previewed instead of silently sent for signing.
        const simulationResult = await simulateContractTransaction(unsignedXdr, { config })
        setSimulation(simulationResult as ParsedSimulationResult<ContractNativeValue>)
        if (simulationResult.status === 'error') {
          throw new ContractError(simulationResult.error ?? 'Contract simulation failed.')
        }

        const signedXdr = await signTransaction(unsignedXdr)
        if (!signedXdr) {
          throw new ContractError('Transaction signing was cancelled or failed')
        }

        const scanResult = await client.submitScanTransaction(signedXdr)
        setResult(scanResult)
        haptics.scanSuccess()
        return scanResult
      } catch (err) {
        const parsed = parseStellarError(err)
        setError(parsed.message)
        haptics.error()
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [contractId, signTransaction]
  )

  return { scan, isLoading, error, result, simulation, reset }
}
