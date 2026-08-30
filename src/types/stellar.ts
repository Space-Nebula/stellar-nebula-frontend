/**
 * Stellar blockchain types used across the application.
 */

/** Supported Stellar network identifiers */
export type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet'

/** A Stellar public key (G…) */
export type PublicKey = string

/** A Stellar secret key (S…) */
export type SecretKey = string

/** A Stellar contract / account address */
export type Address = string

/** Raw XDR string */
export type XDR = string

// ─── Account ─────────────────────────────────────────────────────────────────

export interface StellarBalance {
  /** Asset code, e.g. "XLM" or "USDC" */
  asset: string
  /** Issuer public key (undefined for native XLM) */
  issuer?: PublicKey
  /** Human-readable balance string */
  balance: string
}

export interface StellarAccount {
  /** Stellar public key */
  publicKey: PublicKey
  /** Account sequence number */
  sequence: string
  /** All balances held by this account */
  balances: StellarBalance[]
  /** Whether the account exists on-chain */
  isActive: boolean
}

// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'timeout'

export interface StellarTransaction {
  /** Transaction hash */
  hash: string
  /** Ledger the transaction was included in */
  ledger?: number
  /** ISO-8601 timestamp */
  createdAt: string
  /** Source account public key */
  sourceAccount: PublicKey
  /** Fee paid in stroops */
  feeCharged: string
  status: TransactionStatus
  /** Memo attached to the transaction (if any) */
  memo?: string
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'walletconnect' | 'manual'

export interface WalletState {
  /** Whether a wallet is currently connected */
  isConnected: boolean
  /** Connected account public key */
  publicKey: PublicKey | null
  /** Which wallet adapter is active */
  walletType: WalletType | null
  /** Network the wallet is connected to */
  network: StellarNetwork | null
}
