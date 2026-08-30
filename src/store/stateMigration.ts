/**
 * State migration utilities for Zustand persist stores.
 *
 * Provides version-aware migration logic that detects old schema versions,
 * migrates data to the current schema, and logs migration events.
 */

const MIGRATION_LOG_KEY = 'stellar-nebula:migration-log'
const APP_VERSION_KEY = 'stellar-nebula:app-version'

export interface MigrationLogEntry {
  storeName: string
  fromVersion: number
  toVersion: number
  migratedAt: string
}

export function getAppVersion(): string {
  try {
    return localStorage.getItem(APP_VERSION_KEY) ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export function setAppVersion(version: string): void {
  try {
    localStorage.setItem(APP_VERSION_KEY, version)
  } catch {
    // Ignore quota errors
  }
}

export function getMigrationLog(): MigrationLogEntry[] {
  try {
    const raw = localStorage.getItem(MIGRATION_LOG_KEY)
    return raw ? (JSON.parse(raw) as MigrationLogEntry[]) : []
  } catch {
    return []
  }
}

function appendMigrationLog(entry: MigrationLogEntry): void {
  try {
    const log = getMigrationLog()
    log.push(entry)
    localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(log.slice(-50)))
  } catch {
    // Ignore quota errors
  }
}

export function logMigration(
  storeName: string,
  fromVersion: number,
  toVersion: number
): void {
  appendMigrationLog({
    storeName,
    fromVersion,
    toVersion,
    migratedAt: new Date().toISOString(),
  })
}

/**
 * Creates a version-aware migrate function for a Zustand persist store.
 * If the persisted version is older than the current schema version,
 * the migrate callback is invoked to transform the data.
 * If no migration function is provided, stale data is dropped entirely.
 */
export function createVersionedMigrate<T>(
  storeName: string,
  currentVersion: number,
  migrateFn?: (persisted: unknown, version: number) => T
): (persistedState: unknown, version: number) => T {
  return (persistedState: unknown, version: number) => {
    if (version < currentVersion) {
      logMigration(storeName, version, currentVersion)

      if (migrateFn) {
        return migrateFn(persistedState, version)
      }

      return persistedState as T
    }

    return persistedState as T
  }
}

/**
 * Clears all migration logs and version markers.
 */
export function clearMigrationData(): void {
  try {
    localStorage.removeItem(MIGRATION_LOG_KEY)
    localStorage.removeItem(APP_VERSION_KEY)
  } catch {
    // Ignore
  }
}
