import { faker } from '@faker-js/faker'
import type { ContractEventRecord, ContractEventType } from '@/services/contracts/eventListener'
import type {
  ContractErrorCategory,
  ContractErrorInfo,
} from '@/services/contracts/errorTranslation'
import type { ContractVersion } from '@/services/contracts/migration'
import type { ContractCallOptions } from '@/services/contracts/soroban'

const EVENT_TYPES: ContractEventType[] = [
  'ScanCompleted',
  'ShipUpgraded',
  'ResourceMinted',
  'Unknown',
]

const ERROR_CATEGORIES: ContractErrorCategory[] = [
  'auth',
  'insufficient',
  'network',
  'contract',
  'validation',
  'unknown',
]

export interface ContractEventRecordOverrides {
  id?: string
  type?: ContractEventType
  summary?: string
  ledger?: number
  txHash?: string
  contractId?: string
  timestamp?: string
  raw?: unknown
}

export function buildContractEventRecord(
  overrides: ContractEventRecordOverrides = {}
): ContractEventRecord {
  return {
    id: overrides.id ?? faker.string.uuid(),
    type: overrides.type ?? faker.helpers.arrayElement(EVENT_TYPES),
    summary: overrides.summary ?? faker.lorem.sentence(),
    ledger: overrides.ledger ?? faker.number.int({ min: 100000, max: 200000 }),
    txHash: overrides.txHash ?? faker.string.alphanumeric(64),
    contractId: overrides.contractId ?? faker.string.alphanumeric(56),
    timestamp: overrides.timestamp ?? faker.date.recent().toISOString(),
    raw: overrides.raw ?? { data: faker.string.alphanumeric(10) },
  }
}

export interface ContractErrorInfoOverrides {
  title?: string
  message?: string
  category?: ContractErrorCategory
  resolution?: string[]
  severity?: ContractErrorInfo['severity']
}

export function buildContractErrorInfo(
  overrides: ContractErrorInfoOverrides = {}
): ContractErrorInfo {
  return {
    title: overrides.title ?? faker.lorem.words(3),
    message: overrides.message ?? faker.lorem.sentence(),
    category: overrides.category ?? faker.helpers.arrayElement(ERROR_CATEGORIES),
    resolution: overrides.resolution ?? [faker.lorem.sentence(), faker.lorem.sentence()],
    severity: overrides.severity ?? 'error',
  }
}

export interface ContractVersionOverrides {
  version?: string
  hash?: string
  compatibleVersions?: string[]
}

export function buildContractVersion(overrides: ContractVersionOverrides = {}): ContractVersion {
  return {
    version: overrides.version ?? faker.system.semver(),
    hash: overrides.hash ?? faker.string.hexadecimal({ length: 64, prefix: '' }),
    compatibleVersions: overrides.compatibleVersions ?? [faker.system.semver()],
  }
}

export interface ContractCallOptionsOverrides {
  fee?: string
  timeoutSeconds?: number
}

export function buildContractCallOptions(
  overrides: ContractCallOptionsOverrides = {}
): ContractCallOptions {
  return {
    fee: overrides.fee ?? faker.number.int({ min: 100, max: 10000 }).toString(),
    timeoutSeconds: overrides.timeoutSeconds ?? faker.number.int({ min: 30, max: 180 }),
  }
}
