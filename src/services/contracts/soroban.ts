import { Contract, TransactionBuilder, BASE_FEE, nativeToScVal, rpc } from '@stellar/stellar-sdk'
import { getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'
import type { ResourceType } from '@/types/game'
import type { XDR } from '@/types'
import { parseContractResponseXdr } from '@/utils/stellar/responseParser'
import { retryAsync, isRetryableStellarError } from '@/utils/stellar/retry'

export interface ScanNebulaParams {
  nebulaId: string
  scannerPublicKey: string
}

export interface ScanNebulaResult {
  resourceType: ResourceType
  amount: number
  transactionHash: string
}

export interface ContractCallOptions {
  fee?: string
  timeoutSeconds?: number
}

export class ContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractError'
  }
}

const RESOURCE_TYPE_MAP: Record<string, ResourceType> = {
  nebulite: 'nebulite',
  stellarium: 'stellarium',
  voidcrystal: 'voidcrystal',
  dark_matter: 'darkMatter',
}

const POLL_INTERVAL_MS = 1000
const MAX_POLL_ATTEMPTS = 20

/**
 * Client for interacting with Soroban smart contracts.
 *
 * Handles building, signing, submitting, and polling contract transactions.
 *
 * @example
 * const client = new SorobanContractClient(contractId, config)
 * const xdr = await client.buildScanTransaction({ nebulaId, scannerPublicKey })
 */
export class SorobanContractClient {
  private readonly server: rpc.Server
  private readonly config: StellarNetworkConfig
  private readonly contractId: string

  constructor(contractId: string, config: StellarNetworkConfig = getActiveStellarConfig()) {
    this.contractId = contractId
    this.config = config
    this.server = new rpc.Server(config.rpcUrl)
  }

  /**
   * Build an unsigned XDR for a scan_nebula contract call.
   * The caller must sign the returned XDR via a wallet.
   */
  async buildScanTransaction(
    params: ScanNebulaParams,
    options: ContractCallOptions = {}
  ): Promise<XDR> {
    const { nebulaId, scannerPublicKey } = params
    const fee = options.fee ?? BASE_FEE
    const timeoutSeconds = options.timeoutSeconds ?? 30

    const account = await this.server.getAccount(scannerPublicKey)
    const contract = new Contract(this.contractId)

    const tx = new TransactionBuilder(account, {
      fee,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'scan_nebula',
          nativeToScVal(nebulaId, { type: 'string' }),
          nativeToScVal(scannerPublicKey, { type: 'address' })
        )
      )
      .setTimeout(timeoutSeconds)
      .build()

    const prepared = await this.server.prepareTransaction(tx)
    return prepared.toXDR()
  }

  /**
   * Submit a signed scan_nebula transaction and poll for the result.
   */
  async submitScanTransaction(signedXdr: XDR): Promise<ScanNebulaResult> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.config.networkPassphrase)
    const sendResult = await retryAsync(async () => this.server.sendTransaction(tx), {
      retries: 2,
      shouldRetry: (error) => isRetryableStellarError(error),
    })

    if (sendResult.status === 'ERROR') {
      const errXdr = (sendResult as { errorResult?: { toXDR: (fmt: string) => string } })
        .errorResult
      throw new ContractError(
        `Transaction submission failed: ${errXdr?.toXDR('base64') ?? 'unknown error'}`
      )
    }

    const finalResult = await this.pollTransaction(sendResult.hash)
    const parsed = this.parseScanResult(finalResult)

    return { ...parsed, transactionHash: sendResult.hash }
  }

  /** Poll the network until a transaction is confirmed or times out. */
  private async pollTransaction(hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      const result = await this.server.getTransaction(hash)

      if (result.status === 'SUCCESS') {
        return result as rpc.Api.GetSuccessfulTransactionResponse
      }
      if (result.status === 'FAILED') {
        throw new ContractError('Transaction failed on-chain')
      }
    }
    throw new ContractError('Transaction confirmation timed out')
  }

  /** Parse the contract return value into a ScanNebulaResult. */
  private parseScanResult(
    result: rpc.Api.GetSuccessfulTransactionResponse
  ): Omit<ScanNebulaResult, 'transactionHash'> {
    if (!result.returnValue) {
      throw new ContractError('Contract returned no value')
    }

    const responseXdr =
      typeof (result.returnValue as { toXDR?: (format: string) => string }).toXDR === 'function'
        ? (result.returnValue as { toXDR: (format: string) => string }).toXDR('base64')
        : null

    if (!responseXdr) {
      throw new ContractError('Unable to decode contract return value')
    }

    const native = parseContractResponseXdr<{
      resource_type: string
      amount: bigint | number | string
    }>(responseXdr).value

    const resourceType = RESOURCE_TYPE_MAP[native.resource_type] ?? 'nebulite'
    const amount = Number(native.amount)

    return { resourceType, amount }
  }
}
