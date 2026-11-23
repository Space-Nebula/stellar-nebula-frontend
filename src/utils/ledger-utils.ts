import type { StellarNetwork } from '@/config/stellar'
import { createScopedLogger } from '@/services/logging'

const log = createScopedLogger('LedgerUtils')

/** SLIP-0044 coin type 148 (Stellar) under BIP-44; the account index is appended. */
const STELLAR_HD_PATH_PREFIX = "44'/148'"

const errorContext = (err: unknown) => ({ error: err instanceof Error ? err.message : String(err) })

export interface LedgerDeviceInfo {
  modelId: string
  modelName: string
  firmwareVersion: string
  isLocked: boolean
}

export async function checkLedgerSupport(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      return false
    }

    const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then(
      (m) => m.default || m
    )

    if (!TransportWebUSB) {
      return false
    }

    const isSupported = await TransportWebUSB.isSupported()
    log.info('Ledger support check', { isSupported })
    return isSupported
  } catch (err) {
    log.debug('Ledger support check failed', errorContext(err))
    return false
  }
}

export async function getLedgerDeviceInfo(): Promise<LedgerDeviceInfo | null> {
  try {
    const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then(
      (m) => m.default || m
    )

    if (!TransportWebUSB) {
      return null
    }

    const transport = await TransportWebUSB.create()
    const deviceInfo = transport.deviceModel

    if (!deviceInfo) {
      return null
    }

    const info: LedgerDeviceInfo = {
      modelId: deviceInfo.id,
      modelName: deviceInfo.productName,
      firmwareVersion:
        (transport as typeof transport & { firmwareVersion?: string }).firmwareVersion || 'unknown',
      isLocked: false,
    }

    log.info('Retrieved Ledger device info', { modelName: info.modelName })
    return info
  } catch (err) {
    log.warn('Failed to get Ledger device info', errorContext(err))
    return null
  }
}

export function getNetworkPassphrase(network: StellarNetwork): string {
  const passphrases: Record<StellarNetwork, string> = {
    testnet: 'Test SDF Network ; September 2015',
    futurenet: 'Test SDF Future Network ; October 2022',
    mainnet: 'Public Global Stellar Network ; September 2015',
  }
  return passphrases[network]
}

export function getDerivationPath(accountIndex: number = 0): string {
  return `${STELLAR_HD_PATH_PREFIX}/${accountIndex}'`
}

export function validatePublicKey(publicKey: string): boolean {
  if (!publicKey || typeof publicKey !== 'string') {
    return false
  }

  // Stellar public keys start with 'G' and are 56 characters
  const stellarKeyPattern = /^G[A-Z2-7]{55}$/
  const isValid = stellarKeyPattern.test(publicKey)

  if (!isValid) {
    log.warn('Invalid Stellar public key format', { publicKeyPrefix: publicKey.slice(0, 8) })
  }

  return isValid
}

export async function isLedgerConnected(): Promise<boolean> {
  try {
    const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then(
      (m) => m.default || m
    )

    if (!TransportWebUSB) {
      return false
    }

    const transport = await TransportWebUSB.create()
    const isConnected = !!transport

    if (isConnected) {
      log.info('Ledger device connected')
    }

    return isConnected
  } catch (err) {
    log.debug('Ledger not connected', errorContext(err))
    return false
  }
}

export function formatLedgerError(error: unknown): string {
  if (error instanceof Error) {
    // Handle common Ledger errors
    if (error.message.includes('NotFoundError')) {
      return 'Ledger device not found. Please check the connection.'
    }
    if (error.message.includes('TransportOpenUserCancelled')) {
      return 'Connection request was cancelled. Please try again.'
    }
    if (error.message.includes('TransportInterfaceNotAvailable')) {
      return 'USB interface not available. Try a different USB port.'
    }
    if (error.message.includes('User denied')) {
      return 'Transaction denied on Ledger device.'
    }
    if (error.message.includes('locked')) {
      return 'Ledger device is locked. Please unlock it.'
    }

    return error.message
  }

  return 'An unknown error occurred with the Ledger device'
}
