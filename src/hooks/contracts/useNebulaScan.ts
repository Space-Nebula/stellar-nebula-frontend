import { useState, useCallback } from 'react'
import { SorobanContractClient, ContractError } from '@services/contracts'
import { getActiveStellarConfig } from '@/config/stellar'
import type { ScanNebulaParams, ScanNebulaResult } from '@services/contracts'
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

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  const scan = useCallback(
    async (nebulaId: string, scannerPublicKey: string): Promise<ScanNebulaResult | null> => {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const config = getActiveStellarConfig()
        const client = new SorobanContractClient(contractId, config)

        const params: ScanNebulaParams = { nebulaId, scannerPublicKey }
        const unsignedXdr = await client.buildScanTransaction(params)

        const signedXdr = await signTransaction(unsignedXdr)
        if (!signedXdr) {
          throw new ContractError('Transaction signing was cancelled or failed')
        }

        const scanResult = await client.submitScanTransaction(signedXdr)
        setResult(scanResult)
        return scanResult
      } catch (err) {
        const message =
          err instanceof ContractError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Scan failed due to an unknown error'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [contractId, signTransaction]
  )

  return { scan, isLoading, error, result, reset }
}
