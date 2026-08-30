import { faker } from '@faker-js/faker'
import type { ContractEventRecord } from '@/services/contracts/eventListener'
import type { ContractErrorInfo } from '@/services/contracts/errorTranslation'
import type { ContractVersion } from '@/services/contracts/migration'
import type { ContractCallOptions } from '@/services/contracts/soroban'

export interface ContractEventRecordOverrides {
  id?: string
  contractId?: string
  type?: string
  topic?: string[]
  value?: any
  ledger?: number
  timestamp?: string
}

export function buildContractEventRecord(overrides: ContractEventRecordOverrides = {}): ContractEventRecord {
  return {
    id: overrides.id ?? faker.string.uuid(),
    contractId: overrides.contractId ?? faker.string.alphanumeric(56),
    type: overrides.type ?? 'contract',
    topic: overrides.topic ?? [faker.lorem.word(), faker.lorem.word()],
    value: overrides.value ?? { data: faker.string.alphanumeric(10) },
    ledger: overrides.ledger ?? faker.number.int({ min: 100000, max: 200000 }),
    timestamp: overrides.timestamp ?? faker.date.recent().toISOString(),
  }
}

export interface ContractErrorInfoOverrides {
  code?: string
  message?: string
  details?: Record<string, unknown>
}

export function buildContractErrorInfo(overrides: ContractErrorInfoOverrides = {}): ContractErrorInfo {
  return {
    code: overrides.code ?? faker.string.numeric(4),
    message: overrides.message ?? faker.lorem.sentence(),
    details: overrides.details ?? { reason: faker.lorem.word() },
  }
}

export interface ContractVersionOverrides {
  version?: string
  hash?: string
  deployedAt?: string
}

export function buildContractVersion(overrides: ContractVersionOverrides = {}): ContractVersion {
  return {
    version: overrides.version ?? faker.system.semver(),
    hash: overrides.hash ?? faker.string.hexadecimal({ length: 64, prefix: '' }),
    deployedAt: overrides.deployedAt ?? faker.date.past().toISOString(),
  }
}

export interface ContractCallOptionsOverrides {
  contractId?: string
  method?: string
  args?: any[]
}

export function buildContractCallOptions(overrides: ContractCallOptionsOverrides = {}): ContractCallOptions {
  return {
    contractId: overrides.contractId ?? faker.string.alphanumeric(56),
    method: overrides.method ?? faker.lorem.word(),
    args: overrides.args ?? [faker.lorem.word()],
  }
}
