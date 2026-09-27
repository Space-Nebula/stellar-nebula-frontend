import { faker } from '@faker-js/faker'
import type { ContractEventRecord, ContractEventType } from '@/services/contracts/eventListener'
import type {
  ContractErrorInfo,
  ContractErrorCategory,
} from '@/services/contracts/errorTranslation'
import type { ContractVersion, MigrationState } from '@/services/contracts/migration'
import type { ScanNebulaResult, ContractCallOptions } from '@/services/contracts/soroban'
import type {
  ShipUpgradeBuildResult,
  ShipUpgradeQuote,
  ShipUpgradeRequirements,
  ShipUpgradeStats,
} from '@/services/contracts/shipUpgrade'
import type { SemanticVersion, VersionCheckResult } from '@/services/contracts/versionCheck'

// ─── ContractEventRecord ────────────────────────────────────────────────────

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
  const type = overrides.type ?? faker.helpers.arrayElement(EVENT_TYPES)
  const summaries: Record<ContractEventType, string> = {
    ScanCompleted: 'A scan completed successfully.',
    ShipUpgraded: 'A ship upgrade event was detected.',
    ResourceMinted: 'A resource mint event was detected.',
    Unknown: faker.lorem.sentence(),
  }
  return {
    id: overrides.id ?? faker.string.uuid(),
    type,
    summary: overrides.summary ?? summaries[type],
    ledger: overrides.ledger ?? faker.number.int({ min: 100000, max: 900000 }),
    txHash: overrides.txHash ?? faker.string.hexadecimal({ length: 64, prefix: '' }),
    contractId: overrides.contractId ?? faker.string.alphanumeric(56),
    timestamp: overrides.timestamp ?? faker.date.recent().toISOString(),
    raw: overrides.raw ?? { data: faker.string.alphanumeric(10), topic: faker.lorem.word() },
  }
}

export function buildContractEventRecordList(
  count = 5,
  overrides: ContractEventRecordOverrides = {}
): ContractEventRecord[] {
  return Array.from({ length: count }, () => buildContractEventRecord(overrides))
} // ─── ContractErrorInfo ──────────────────────────────────────────────────────

const ERROR_SEVERITIES: ContractErrorInfo['severity'][] = ['error', 'warning', 'info']

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
    title:
      overrides.title ??
      faker.helpers.arrayElement([
        'Authorization Required',
        'Insufficient Balance',
        'Network Error',
        'Contract Not Found',
        'Invalid Address',
      ]),
    message: overrides.message ?? faker.lorem.sentence(),
    category: overrides.category ?? faker.helpers.arrayElement(ERROR_CATEGORIES),
    resolution: overrides.resolution ?? [faker.lorem.sentence(), faker.lorem.sentence()],
    severity: overrides.severity ?? faker.helpers.arrayElement(ERROR_SEVERITIES),
  }
}

export function buildContractErrorInfoList(
  count = 3,
  overrides: ContractErrorInfoOverrides = {}
): ContractErrorInfo[] {
  return Array.from({ length: count }, () => buildContractErrorInfo(overrides))
}

// ─── ContractVersion & Migration ────────────────────────────────────────────

export interface ContractVersionOverrides {
  version?: string
  hash?: string
  compatibleVersions?: string[]
}

export function buildContractVersion(overrides: ContractVersionOverrides = {}): ContractVersion {
  return {
    version: overrides.version ?? faker.system.semver(),
    hash: overrides.hash ?? faker.string.hexadecimal({ length: 64, prefix: '' }),
    compatibleVersions:
      overrides.compatibleVersions ??
      Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.system.semver()),
  }
}

export interface MigrationStateOverrides {
  previousVersion?: string
  currentVersion?: string
  requiresMigration?: boolean
  dataPreserved?: boolean
  migratedAt?: number
}

export function buildMigrationState(overrides: MigrationStateOverrides = {}): MigrationState {
  return {
    previousVersion: overrides.previousVersion ?? faker.system.semver(),
    currentVersion: overrides.currentVersion ?? faker.system.semver(),
    requiresMigration: overrides.requiresMigration ?? faker.datatype.boolean(),
    dataPreserved: overrides.dataPreserved ?? true,
    migratedAt: overrides.migratedAt ?? faker.date.recent().getTime(),
  }
}

// ─── Soroban / ScanNebula ───────────────────────────────────────────────────

export interface ContractCallOptionsOverrides {
  fee?: string
  timeoutSeconds?: number
}

export function buildContractCallOptions(
  overrides: ContractCallOptionsOverrides = {}
): ContractCallOptions {
  return {
    fee: overrides.fee ?? String(faker.number.int({ min: 100, max: 10000 })),
    timeoutSeconds: overrides.timeoutSeconds ?? faker.number.int({ min: 10, max: 60 }),
  }
}

export interface ScanNebulaResultOverrides {
  resourceType?: ScanNebulaResult['resourceType']
  amount?: number
  transactionHash?: string
}

export function buildScanNebulaResult(overrides: ScanNebulaResultOverrides = {}): ScanNebulaResult {
  const types: ScanNebulaResult['resourceType'][] = [
    'nebulite',
    'stellarium',
    'voidcrystal',
    'darkMatter',
  ]
  return {
    resourceType: overrides.resourceType ?? faker.helpers.arrayElement(types),
    amount: overrides.amount ?? faker.number.int({ min: 10, max: 500 }),
    transactionHash:
      overrides.transactionHash ?? faker.string.hexadecimal({ length: 64, prefix: '' }),
  }
}

export function buildScanNebulaResultList(
  count = 3,
  overrides: ScanNebulaResultOverrides = {}
): ScanNebulaResult[] {
  return Array.from({ length: count }, () => buildScanNebulaResult(overrides))
}

// ─── Ship Upgrade ───────────────────────────────────────────────────────────

export interface ShipUpgradeRequirementsOverrides {
  credits?: number
  stardust?: number
  nebulite?: number
  cosmicDust?: number
}

export function buildShipUpgradeRequirements(
  overrides: ShipUpgradeRequirementsOverrides = {}
): ShipUpgradeRequirements {
  return {
    credits: overrides.credits ?? faker.number.int({ min: 100, max: 1000 }),
    stardust: overrides.stardust ?? faker.number.int({ min: 5, max: 50 }),
    nebulite: overrides.nebulite ?? faker.number.int({ min: 10, max: 80 }),
    cosmicDust: overrides.cosmicDust ?? faker.number.int({ min: 1, max: 10 }),
  }
}

export interface ShipUpgradeStatsOverrides {
  hull?: number
  shield?: number
  speed?: number
  cargoCapacity?: number
  crewCapacity?: number
}

export function buildShipUpgradeStats(overrides: ShipUpgradeStatsOverrides = {}): ShipUpgradeStats {
  return {
    hull: overrides.hull ?? faker.number.int({ min: 80, max: 200 }),
    shield: overrides.shield ?? faker.number.int({ min: 40, max: 150 }),
    speed: overrides.speed ?? faker.number.int({ min: 5, max: 20 }),
    cargoCapacity: overrides.cargoCapacity ?? faker.number.int({ min: 50, max: 300 }),
    crewCapacity: overrides.crewCapacity ?? faker.number.int({ min: 2, max: 10 }),
  }
}

export interface ShipUpgradeQuoteOverrides {
  canUpgrade?: boolean
  requirements?: ShipUpgradeRequirements
  updatedStats?: ShipUpgradeStats
}

export function buildShipUpgradeQuote(overrides: ShipUpgradeQuoteOverrides = {}): ShipUpgradeQuote {
  const requirements = overrides.requirements ?? buildShipUpgradeRequirements()
  const canUpgrade = overrides.canUpgrade ?? faker.datatype.boolean()
  return {
    canUpgrade,
    missing: canUpgrade
      ? []
      : [
          {
            resource: faker.helpers.arrayElement([
              'credits',
              'stardust',
              'nebulite',
              'cosmicDust',
            ] as const),
            deficit: faker.number.int({ min: 1, max: 100 }),
          },
        ],
    requirements,
    updatedStats: overrides.updatedStats ?? buildShipUpgradeStats(),
  }
}

// Mock XDR helper
function buildMockXdr(): string {
  return faker.string.hexadecimal({ length: 256, prefix: '' })
}

export interface ShipUpgradeBuildResultOverrides {
  xdr?: string
  quote?: ShipUpgradeQuote
}

export function buildShipUpgradeBuildResult(
  overrides: ShipUpgradeBuildResultOverrides = {}
): ShipUpgradeBuildResult {
  return {
    xdr: overrides.xdr ?? buildMockXdr(),
    transaction: {
      toXDR: () => overrides.xdr ?? buildMockXdr(),
    } as unknown as ShipUpgradeBuildResult['transaction'],
    quote: overrides.quote ?? buildShipUpgradeQuote(),
    simulation: {
      result: 'success' as const,
      value: { upgraded: true },
      minResourceFee: String(faker.number.int({ min: 100, max: 10000 })),
      transactionData: buildMockXdr(),
      events: [],
    } as unknown as ShipUpgradeBuildResult['simulation'],
  }
}

// ─── Version Check ──────────────────────────────────────────────────────────

export interface SemanticVersionOverrides {
  major?: number
  minor?: number
  patch?: number
  raw?: string
}

export function buildSemanticVersion(overrides: SemanticVersionOverrides = {}): SemanticVersion {
  const major = overrides.major ?? faker.number.int({ min: 0, max: 5 })
  const minor = overrides.minor ?? faker.number.int({ min: 0, max: 10 })
  const patch = overrides.patch ?? faker.number.int({ min: 0, max: 20 })
  return {
    major,
    minor,
    patch,
    raw: overrides.raw ?? `${major}.${minor}.${patch}`,
  }
}

export interface VersionCheckResultOverrides {
  isCompatible?: boolean
  deployedVersion?: SemanticVersion | null
  minVersion?: SemanticVersion
  maxVersion?: SemanticVersion
  message?: string
}

export function buildVersionCheckResult(
  overrides: VersionCheckResultOverrides = {}
): VersionCheckResult {
  const isCompatible = overrides.isCompatible ?? faker.datatype.boolean()
  return {
    isCompatible,
    deployedVersion:
      overrides.deployedVersion !== undefined
        ? overrides.deployedVersion
        : faker.datatype.boolean()
          ? buildSemanticVersion()
          : null,
    minVersion:
      overrides.minVersion ?? buildSemanticVersion({ major: 0, minor: 1, patch: 0, raw: '0.1.0' }),
    maxVersion:
      overrides.maxVersion ?? buildSemanticVersion({ major: 1, minor: 0, patch: 0, raw: '1.0.0' }),
    message: overrides.message ?? faker.lorem.sentence(),
    guidance: isCompatible
      ? undefined
      : {
          message: faker.lorem.sentence(),
          steps: [faker.lorem.sentence(), faker.lorem.sentence()],
        },
  }
}

// ─── Batch helpers ──────────────────────────────────────────────────────────

export function buildContractEventMap(count = 3): Record<string, ContractEventRecord> {
  const map: Record<string, ContractEventRecord> = {}
  for (let i = 0; i < count; i++) {
    const rec = buildContractEventRecord()
    map[rec.id] = rec
  }
  return map
}

// ─── Randomized helpers with valid defaults ─────────────────────────────────

export function buildRandomContractResponse<T>(builder: () => T): T {
  return builder()
}

export function buildContractBatch<T>(
  builder: (overrides?: Partial<T>) => T,
  count = 5,
  overrides: Partial<T> = {}
): T[] {
  return Array.from({ length: count }, () => builder(overrides as any))
}
