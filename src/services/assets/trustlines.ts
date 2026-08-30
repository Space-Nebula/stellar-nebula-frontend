import { Asset, BASE_FEE, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { createHorizonServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'

export interface TrustlineAsset {
  code: string
  issuer: string
}

export interface TrustlineStatus {
  assetCode: string
  assetIssuer: string
  exists: boolean
  isEstablished: boolean
  balance: string
  limit: string
  nativeBalance: string
  subentryCount: number
  reserveDeltaXlm: string
  canAfford: boolean
}

export interface TrustlineReserveCheck {
  availableXlm: string
  requiredXlm: string
  canAfford: boolean
}

export interface TrustlineBuildResult {
  xdr: string
  asset: TrustlineAsset
  feeStroops: string
}

const BASE_RESERVE_XLM = 0.5

function formatXlm(value: number): string {
  return Math.max(0, value).toFixed(7)
}

function getNativeBalance(balances: Array<{ asset_type: string; balance: string }>): string {
  return balances.find((balance) => balance.asset_type === 'native')?.balance ?? '0'
}

function getSubentryCount(account: unknown): number {
  const record = account as { subentry_count?: unknown; subentryCount?: unknown }
  const value = Number(record.subentry_count ?? record.subentryCount ?? 0)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function checkTrustlineReserve(
  nativeBalance: string,
  subentryCount: number
): TrustlineReserveCheck {
  const spendableXlm = Number(nativeBalance)
  const requiredXlm = (2 + subentryCount + 1) * BASE_RESERVE_XLM
  const availableXlm = Math.max(0, spendableXlm - requiredXlm)

  return {
    availableXlm: formatXlm(availableXlm),
    requiredXlm: formatXlm(requiredXlm),
    canAfford: spendableXlm >= requiredXlm,
  }
}

/**
 * Check whether a trustline for a specific asset exists on a Stellar account.
 */
export async function checkTrustline(
  accountId: string,
  assetCode: string,
  assetIssuer: string,
  config?: StellarNetworkConfig
): Promise<TrustlineStatus> {
  return fetchTrustlineStatus(accountId, { code: assetCode, issuer: assetIssuer }, config)
}

export async function fetchTrustlineStatus(
  accountId: string,
  asset: TrustlineAsset,
  config?: StellarNetworkConfig
): Promise<TrustlineStatus> {
  const horizon = createHorizonServer(config ?? getActiveStellarConfig())
  const account = await horizon.accounts().accountId(accountId).call()
  const balances = account.balances as Array<{
    asset_type: string
    asset_code?: string
    asset_issuer?: string
    balance: string
    limit?: string
  }>
  const trustline = balances.find(
    (balance) =>
      balance.asset_type !== 'native' &&
      balance.asset_code === asset.code &&
      balance.asset_issuer === asset.issuer
  )
  const nativeBalance = getNativeBalance(balances)
  const subentryCount = getSubentryCount(account)
  const reserve = checkTrustlineReserve(nativeBalance, subentryCount)
  const reserveDeltaXlm = trustline ? '0.0000000' : BASE_RESERVE_XLM.toFixed(7)

  return {
    assetCode: asset.code,
    assetIssuer: asset.issuer,
    exists: Boolean(trustline),
    isEstablished: Boolean(trustline),
    balance: trustline?.balance ?? '0',
    limit: trustline?.limit ?? '0',
    nativeBalance,
    subentryCount,
    reserveDeltaXlm,
    canAfford: trustline ? true : reserve.canAfford,
  }
}

export async function buildTrustlineTransaction(
  sourcePublicKey: string,
  asset: TrustlineAsset,
  limit?: string,
  config?: StellarNetworkConfig
): Promise<TrustlineBuildResult> {
  const activeConfig = config ?? getActiveStellarConfig()
  const horizon = createHorizonServer(activeConfig)
  const account = await horizon.loadAccount(sourcePublicKey)
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: activeConfig.networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(asset.code, asset.issuer),
        limit,
      })
    )
    .setTimeout(30)
    .build()

  return {
    xdr: transaction.toXDR(),
    asset,
    feeStroops: BASE_FEE,
  }
}

export async function submitTrustlineTransaction(
  signedXdr: string,
  config?: StellarNetworkConfig
): Promise<unknown> {
  const activeConfig = config ?? getActiveStellarConfig()
  const horizon = createHorizonServer(activeConfig)
  const transaction = TransactionBuilder.fromXDR(signedXdr, activeConfig.networkPassphrase)
  return horizon.submitTransaction(transaction)
}

/**
 * Build a ChangeTrust operation XDR for compatibility with older callers.
 */
export function buildTrustlineOperationXdr(
  _sourcePublicKey: string,
  assetCode: string,
  assetIssuer: string,
  limit?: string
): string {
  return `trustline:${assetCode}:${assetIssuer}:${limit ?? 'unlimited'}`
}
