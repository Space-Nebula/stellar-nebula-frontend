import { useMemo } from 'react'
import { useNetworkStore } from '@/store'
import { getActiveStellarConfig } from '@/config/stellar'
import { getNebulaContractId, getTokenContractId } from '@/config/networkContracts'
import type { StellarNetwork } from '@/types'
import type { StellarNetworkConfig } from '@/config/stellar'

export interface UseNetworkConfigResult {
  network: StellarNetwork
  stellarConfig: StellarNetworkConfig
  nebulaContractId: string
  tokenContractId: string
}

/**
 * Hook to get the current network configuration including contract IDs.
 * Updates reactively when the network changes.
 */
export function useNetworkConfig(): UseNetworkConfigResult {
  const network = useNetworkStore((state) => state.network)

  const result = useMemo(() => {
    const stellarConfig = getActiveStellarConfig({
      STELLAR_NETWORK: network,
    })

    return {
      network,
      stellarConfig,
      nebulaContractId: getNebulaContractId(network),
      tokenContractId: getTokenContractId(network),
    }
  }, [network])

  return result
}
