import type { Horizon } from '@stellar/stellar-sdk'
import { createHorizonServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'

export interface TrustlineStatus {
  assetCode: string
  assetIssuer: string
  isEstablished: boolean
  balance: string
  limit: string
}

/**
 * Check whether a trustline for a specific asset exists on a Stellar account.
 *
 * @param accountId  - The Stellar public key
 * @param assetCode  - Asset code to check
 * @param assetIssuer- Issuer public key
 * @param config     - Optional network config override
 *
 * @example
 * const status = await checkTrustline('G...', 'USDC', 'G...')
 */
export async function checkTrustline(
  accountId: string,
  assetCode: string,
  assetIssuer: string,
  config?: StellarNetworkConfig
): Promise<TrustlineStatus> {
  const horizon = createHorizonServer(config ?? getActiveStellarConfig())
  const account = await horizon.accounts().accountId(accountId).call()

  const trustline = account.balances.find(
    (b) =>
      !(b.asset_type === 'native') &&
      'asset_code' in b &&
      b.asset_code === assetCode &&
      'asset_issuer' in b &&
      b.asset_issuer === assetIssuer
  )

  if (trustline && 'asset_code' in trustline) {
    return {
      assetCode,
      assetIssuer,
      isEstablished: true,
      balance: trustline.balance,
      limit: trustline.limit ?? '0',
    }
  }

  return {
    assetCode,
    assetIssuer,
    isEstablished: false,
    balance: '0',
    limit: '0',
  }
}

/**
 * Build a ChangeTrust operation XDR for establishing a new trustline.
 *
 * @returns The base64-encoded XDR string.
 */
export function buildTrustlineOperationXdr(
  sourcePublicKey: string,
  assetCode: string,
  assetIssuer: string,
  limit?: string
): string {
  const network = 'testnet'
  const server = new (require('@stellar/stellar-sdk').Horizon.Server)(
    getActiveStellarConfig({ STELLAR_NETWORK: network } as any).horizonUrl
  )
  // This is a placeholder that would be implemented with actual Stellar SDK
  // transaction building in a production environment.
  return `trustline:${assetCode}:${assetIssuer}:${limit ?? 'unlimited'}`
}
