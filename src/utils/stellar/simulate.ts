import type { rpc } from '@stellar/stellar-sdk'
import { createStellarRpcServer, getActiveStellarConfig } from '@config/stellar'
import { retryAsync, isRetryableStellarError } from './retry'
import { parseSimulationResponse, type ParsedSimulationResult } from './responseParser'
import type { StellarNetworkConfig } from '@config/stellar'

export interface SimulateContractTransactionOptions {
  config?: StellarNetworkConfig
  instructionLeeway?: number
  retries?: number
}

export async function simulateContractTransaction<T = unknown>(
  transactionXdr: string,
  options: SimulateContractTransactionOptions = {}
): Promise<ParsedSimulationResult<T>> {
  const config = options.config ?? getActiveStellarConfig()
  const rpcServer = createStellarRpcServer(config) as rpc.Server & {
    simulateTransaction: (params: Record<string, unknown>) => Promise<unknown>
  }

  const response = await retryAsync(
    async () =>
      rpcServer.simulateTransaction({
        transaction: transactionXdr,
        ...(typeof options.instructionLeeway === 'number'
          ? { resourceConfig: { instructionLeeway: options.instructionLeeway } }
          : {}),
      }),
    {
      retries: options.retries ?? 2,
      shouldRetry: (error) => isRetryableStellarError(error),
    }
  )

  return parseSimulationResponse<T>(response)
}
