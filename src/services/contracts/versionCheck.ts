import { rpc, xdr } from '@stellar/stellar-sdk'
import { createStellarRpcServer, getActiveStellarConfig } from '@/config/stellar'
import type { StellarNetworkConfig } from '@/config/stellar'
import { storeContractVersion, getStoredContractVersion, getMigrationGuidance } from './migration'
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

/** Minimum contract version this frontend is compatible with */
export const MIN_CONTRACT_VERSION: SemanticVersion = {
  major: 0,
  minor: 1,
  patch: 0,
  raw: '0.1.0',
}

/** Maximum (tested) contract version this frontend is compatible with */
export const MAX_CONTRACT_VERSION: SemanticVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  raw: '1.0.0',
}

/**
 * Parse a semver string like "1.2.3" into a SemanticVersion object.
 */
export function parseVersion(raw: string): SemanticVersion | null {
  const match = raw.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw,
  }
}

/**
 * Compare two SemanticVersion objects.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
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
 * attempts to read it via getContractData.
 */
export async function queryContractVersion(
  contractId: string,
  config: StellarNetworkConfig = getActiveStellarConfig()
): Promise<string | null> {
  try {
    const server = createStellarRpcServer(config)
    const key = xdr.ScVal.scvBytes(Buffer.from('__version'))
    const response = await server.getContractData(contractId, key, rpc.Durability.Persistent)

    if (response && response.val) {
      const contractData = response.val.contractData()
      const scVal = contractData.val()
      if (scVal.switch() === xdr.ScValType.scvBytes()) {
        return new TextDecoder().decode(scVal.bytes())
      }
      if (scVal.switch() === xdr.ScValType.scvString()) {
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
  const hasChanged = previousVersion && previousVersion.hash !== deployedVersion.raw

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
