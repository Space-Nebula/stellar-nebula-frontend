import { rpc } from '@stellar/stellar-sdk'
import { createStellarRpcServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'
import {
  storeContractVersion,
  getStoredContractVersion,
  isVersionCompatible,
  getMigrationGuidance,
} from './migration'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('ContractVersionCheck')

/**
 * Semantic version parsed from a contract version string.
 */
export interface SemanticVersion {
  major: number
  minor: number
  patch: number
  raw: string
}

/**
 * Result of a contract version compatibility check.
 */
export interface VersionCheckResult {
  /** Whether the contract version is compatible */
  isCompatible: boolean
  /** The version reported by the contract on-chain */
  deployedVersion: SemanticVersion | null
  /** The minimum version the frontend supports */
  minVersion: SemanticVersion
  /** The maximum version the frontend supports */
  maxVersion: SemanticVersion
  /** Human-readable status message */
  message: string
  /** Migration guidance if incompatible */
  guidance?: { message: string; steps: string[] }
}

/** Minimum contract version this frontend supports (inclusive). */
const MIN_CONTRACT_VERSION: SemanticVersion = { major: 1, minor: 0, patch: 0, raw: '1.0.0' }

/** Maximum contract version this frontend supports (inclusive). */
const MAX_CONTRACT_VERSION: SemanticVersion = { major: 2, minor: 0, patch: 0, raw: '2.0.0' }

/**
 * Parse a version string like "1.2.3" into a SemanticVersion object.
 * Falls back gracefully if the format is unexpected.
 */
export function parseVersion(versionStr: string): SemanticVersion | null {
  if (!versionStr || typeof versionStr !== 'string') return null

  const cleaned = versionStr.replace(/^v/i, '').trim()
  const parts = cleaned.split('.')

  if (parts.length < 2 || parts.length > 3) return null

  const major = parseInt(parts[0], 10)
  const minor = parseInt(parts[1], 10)
  const patch = parts.length === 3 ? parseInt(parts[2], 10) : 0

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null

  return { major, minor, patch, raw: cleaned }
}

/**
 * Compare two semantic versions.
 * Returns -1, 0, or 1.
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1
  return 0
}

/**
 * Check if a version is within the supported range [min, max].
 */
export function isVersionInRange(
  version: SemanticVersion,
  min: SemanticVersion,
  max: SemanticVersion
): boolean {
  return compareVersions(version, min) >= 0 && compareVersions(version, max) <= 0
}

/**
 * Query the Soroban contract for its version via the __version custom contract key.
 *
 * Soroban contracts can expose a `__version` read-only entry. This function
 * attempts to read it via simulateTransaction.
 */
export async function queryContractVersion(
  contractId: string,
  config: StellarNetworkConfig = getActiveStellarConfig()
): Promise<string | null> {
  const server = createStellarRpcServer(config)

  try {
    // Build a simulateContractRead to fetch the __version key
    const contract = new rpc.Server(config.rpcUrl)

    // Use the raw Soroban RPC to read the contract metadata
    const response = await contract.getContractData(contractId, {
      key: rpc.xdr.ScVal.scvBytes(
        new TextEncoder().encode('__version')
      ),
    })

    if (response && response.xdr) {
      // Decode the string from the ScVal
      const scVal = rpc.xdr.ScVal.fromXDR(
        typeof response.xdr === 'string'
          ? Buffer.from(response.xdr, 'base64')
          : response.xdr
      )
      if (scVal.switch() === rpc.xdr.ScValType.scvBytes()) {
        return new TextDecoder().decode(scVal.bytes())
      }
      if (scVal.switch() === rpc.xdr.ScValType.scvString()) {
        return scVal.str().toString()
      }
    }

    return null
  } catch (error) {
    // Contract may not expose __version — not all contracts do
    log.debug('Could not query contract version', {
      contractId: contractId.slice(0, 12),
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Check if the deployed contract version is compatible with this frontend.
 *
 * Queries the on-chain version, compares it with the supported range,
 * and returns a detailed result including migration guidance if needed.
 *
 * @param contractId - The Soroban contract address to check
 * @param config     - Optional network config override
 * @param network    - Stellar network name for migration guidance
 */
export async function checkContractVersionCompatibility(
  contractId: string,
  config?: StellarNetworkConfig,
  network?: 'testnet' | 'mainnet' | 'futurenet'
): Promise<VersionCheckResult> {
  const activeConfig = config ?? getActiveStellarConfig()
  const deployedVersionStr = await queryContractVersion(contractId, activeConfig)
  const deployedVersion = deployedVersionStr ? parseVersion(deployedVersionStr) : null

  // If we can't determine the version, treat as compatible (permissive)
  if (!deployedVersion) {
    log.info('Could not determine contract version — assuming compatible', {
      contractId: contractId.slice(0, 12),
    })
    return {
      isCompatible: true,
      deployedVersion: null,
      minVersion: MIN_CONTRACT_VERSION,
      maxVersion: MAX_CONTRACT_VERSION,
      message: 'Contract version could not be determined. Proceeding with caution.',
    }
  }

  const isCompatible = isVersionInRange(deployedVersion, MIN_CONTRACT_VERSION, MAX_CONTRACT_VERSION)

  // Cache the version for future reference
  storeContractVersion(contractId, deployedVersion.raw)

  // Check if it was previously known
  const previousVersion = getStoredContractVersion(contractId)
  const hasChanged =
    previousVersion && previousVersion.hash !== deployedVersion.raw

  let message: string
  let guidance: { message: string; steps: string[] } | undefined

  if (isCompatible) {
    if (hasChanged) {
      message = `Contract version updated from ${previousVersion!.hash} to ${deployedVersion.raw}. This version is compatible.`
      log.info('Contract version changed but compatible', {
        from: previousVersion!.hash,
        to: deployedVersion.raw,
      })
    } else {
      message = `Contract version ${deployedVersion.raw} is compatible with this application.`
    }
  } else {
    message = `Contract version ${deployedVersion.raw} is outside the supported range (${MIN_CONTRACT_VERSION.raw} – ${MAX_CONTRACT_VERSION.raw}). Some features may not work correctly.`
    guidance = getMigrationGuidance(
      deployedVersion.raw,
      MAX_CONTRACT_VERSION.raw,
      network ?? 'testnet'
    )
    log.warn('Contract version incompatible', {
      deployed: deployedVersion.raw,
      supported: `${MIN_CONTRACT_VERSION.raw}–${MAX_CONTRACT_VERSION.raw}`,
    })
  }

  return {
    isCompatible,
    deployedVersion,
    minVersion: MIN_CONTRACT_VERSION,
    maxVersion: MAX_CONTRACT_VERSION,
    message,
    guidance,
  }
}

/**
 * Quick boolean check — returns true if compatible or version is unknown.
 */
export async function isContractCompatible(
  contractId: string,
  config?: StellarNetworkConfig
): Promise<boolean> {
  const result = await checkContractVersionCompatibility(contractId, config)
  return result.isCompatible
}
