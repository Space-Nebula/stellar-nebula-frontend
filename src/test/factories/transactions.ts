import { faker } from '@faker-js/faker'
import type {
  StellarTransaction,
  StellarAccount,
  StellarBalance,
  WalletState,
  TransactionStatus,
} from '@/types/stellar'

const TRANSACTION_STATUSES: TransactionStatus[] = ['pending', 'success', 'failed', 'timeout']

export interface StellarTransactionOverrides {
  hash?: string
  ledger?: number
  createdAt?: string
  sourceAccount?: string
  feeCharged?: string
  status?: TransactionStatus
  memo?: string
}

export function buildStellarTransaction(
  overrides: StellarTransactionOverrides = {}
): StellarTransaction {
  return {
    hash: overrides.hash ?? faker.string.hexadecimal({ length: 64 }),
    ledger: overrides.ledger ?? faker.number.int({ min: 1000000, max: 9999999 }),
    createdAt: overrides.createdAt ?? faker.date.recent({ days: 7 }).toISOString(),
    sourceAccount:
      overrides.sourceAccount ?? faker.string.alphanumeric({ length: 56, casing: 'upper' }),
    feeCharged: overrides.feeCharged ?? String(faker.number.int({ min: 100, max: 10000 })),
    status: overrides.status ?? faker.helpers.arrayElement(TRANSACTION_STATUSES),
    memo: overrides.memo ?? (faker.datatype.boolean(0.7) ? faker.lorem.words(3) : undefined),
  }
}

export function buildStellarTransactionList(
  count = 5,
  overrides: StellarTransactionOverrides = {}
): StellarTransaction[] {
  return Array.from({ length: count }, () => buildStellarTransaction(overrides))
}

export interface StellarBalanceOverrides {
  asset?: string
  issuer?: string
  balance?: string
}

export function buildStellarBalance(overrides: StellarBalanceOverrides = {}): StellarBalance {
  return {
    asset: overrides.asset ?? faker.helpers.arrayElement(['XLM', 'USDC', 'yUSDC', 'NEB']),
    issuer:
      overrides.issuer ??
      (faker.datatype.boolean(0.6)
        ? faker.string.alphanumeric({ length: 56, casing: 'upper' })
        : undefined),
    balance:
      overrides.balance ?? faker.number.float({ min: 0, max: 50000, fractionDigits: 7 }).toFixed(7),
  }
}

export interface StellarAccountOverrides {
  publicKey?: string
  sequence?: string
  balances?: StellarBalance[]
  isActive?: boolean
}

export function buildStellarAccount(overrides: StellarAccountOverrides = {}): StellarAccount {
  return {
    publicKey: overrides.publicKey ?? faker.string.alphanumeric({ length: 56, casing: 'upper' }),
    sequence:
      overrides.sequence ?? String(faker.number.bigInt({ min: 100000000000, max: 999999999999 })),
    balances: overrides.balances ?? [
      buildStellarBalance({
        asset: 'XLM',
        issuer: undefined,
        balance: faker.number.float({ min: 10, max: 5000, fractionDigits: 7 }).toFixed(7),
      }),
      buildStellarBalance({
        asset: 'USDC',
        balance: faker.number.float({ min: 0, max: 1000, fractionDigits: 7 }).toFixed(7),
      }),
    ],
    isActive: overrides.isActive ?? faker.datatype.boolean(0.9),
  }
}

export interface WalletStateOverrides {
  isConnected?: boolean
  publicKey?: string | null
  walletType?: 'freighter' | 'albedo' | 'xbull' | 'manual' | null
  network?: 'testnet' | 'mainnet' | 'futurenet' | null
}

export function buildWalletState(overrides: WalletStateOverrides = {}): WalletState {
  return {
    isConnected: overrides.isConnected ?? faker.datatype.boolean(0.8),
    publicKey:
      overrides.publicKey ??
      (faker.datatype.boolean(0.9)
        ? faker.string.alphanumeric({ length: 56, casing: 'upper' })
        : null),
    walletType:
      overrides.walletType ??
      faker.helpers.arrayElement(['freighter', 'albedo', 'xbull', 'manual'] as const),
    network:
      overrides.network ?? faker.helpers.arrayElement(['testnet', 'mainnet', 'futurenet'] as const),
  }
}
