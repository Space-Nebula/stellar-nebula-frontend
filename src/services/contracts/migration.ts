import { createScopedLogger } from '@/services/logging'
import type { StellarNetwork } from '@/types'

const log = createScopedLogger('ContractMigration')

export interface ContractVersion {
  version: string
  hash: string
  compatibleVersions: string[]
}

export interface MigrationState {
  previousVersion: string
  currentVersion: string
  requiresMigration: boolean
  dataPreserved: boolean
  migratedAt: number
}

const MIGRATION_STORAGE_KEY = 'stellar-nebula:contract-migration'
const CONTRACT_VERSION_STORAGE_KEY = 'stellar-nebula:contract-version'

/**
 * Detect if a contract upgrade has occurred by comparing hashes.
 */
export function detectContractUpgrade(
  previousHash: string | null,
  currentHash: string,
  contractId: string
): boolean {
  if (!previousHash) {
    log.info('Initial contract detection', { contractId })
    return false
  }

  const hasUpgraded = previousHash !== currentHash
  if (hasUpgraded) {
    log.warn('Contract upgrade detected', {
      contractId,
      previousHash: previousHash.slice(0, 8),
      currentHash: currentHash.slice(0, 8),
    })
  }

  return hasUpgraded
}

/**
 * Store contract version info for future upgrade detection.
 */
export function storeContractVersion(contractId: string, hash: string): void {
  try {
    const versions = getStoredContractVersions()
    versions[contractId] = {
      hash,
      timestamp: Date.now(),
    }
    localStorage.setItem(CONTRACT_VERSION_STORAGE_KEY, JSON.stringify(versions))
  } catch (err) {
    log.error('Failed to store contract version', err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Get previously stored contract version info.
 */
export function getStoredContractVersion(contractId: string): {
  hash: string
  timestamp: number
} | null {
  try {
    const versions = getStoredContractVersions()
    return versions[contractId] ?? null
  } catch {
    return null
  }
}

function getStoredContractVersions(): Record<
  string,
  {
    hash: string
    timestamp: number
  }
> {
  try {
    const raw = localStorage.getItem(CONTRACT_VERSION_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, { hash: string; timestamp: number }>) : {}
  } catch {
    return {}
  }
}

/**
 * Record a migration event for contract upgrade.
 */
export function recordMigration(contractId: string, fromVersion: string, toVersion: string): void {
  try {
    const migration: MigrationState = {
      previousVersion: fromVersion,
      currentVersion: toVersion,
      requiresMigration: true,
      dataPreserved: true,
      migratedAt: Date.now(),
    }
    localStorage.setItem(`${MIGRATION_STORAGE_KEY}:${contractId}`, JSON.stringify(migration))
    log.info('Migration recorded', {
      contractId,
      from: fromVersion,
      to: toVersion,
    })
  } catch (err) {
    log.error('Failed to record migration', err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Get migration history for a contract.
 */
export function getMigrationHistory(contractId: string): MigrationState | null {
  try {
    const raw = localStorage.getItem(`${MIGRATION_STORAGE_KEY}:${contractId}`)
    return raw ? (JSON.parse(raw) as MigrationState) : null
  } catch {
    return null
  }
}

/**
 * Check if a contract version is compatible with the current version.
 */
export function isVersionCompatible(
  userVersion: string,
  currentVersion: string,
  compatibleVersions: string[]
): boolean {
  if (userVersion === currentVersion) {
    return true
  }

  if (compatibleVersions.includes(userVersion)) {
    log.info('Using compatible version', {
      userVersion,
      currentVersion,
    })
    return true
  }

  log.warn('Version incompatibility detected', {
    userVersion,
    currentVersion,
    compatible: compatibleVersions,
  })

  return false
}

/**
 * Get migration guidance for users on old contract versions.
 */
export function getMigrationGuidance(
  userVersion: string,
  currentVersion: string,
  network: StellarNetwork
): { message: string; steps: string[] } {
  const networkLabel = network.charAt(0).toUpperCase() + network.slice(1)

  return {
    message: `The contract has been upgraded from v${userVersion} to v${currentVersion} on ${networkLabel}.`,
    steps: [
      'Your wallet session will be refreshed to load the new contract',
      'Your data will be preserved during the migration',
      'You may need to re-approve transactions after the upgrade',
      'If you encounter issues, please try disconnecting and reconnecting your wallet',
    ],
  }
}

/**
 * Clear all stored migration data (useful for testing or manual reset).
 */
export function clearMigrationData(): void {
  try {
    localStorage.removeItem(MIGRATION_STORAGE_KEY)
    localStorage.removeItem(CONTRACT_VERSION_STORAGE_KEY)
    log.info('Migration data cleared')
  } catch (err) {
    log.error('Failed to clear migration data', err instanceof Error ? err : new Error(String(err)))
  }
}
