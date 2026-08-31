import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import Str from '@ledgerhq/hw-app-str'
import { Keypair, StrKey, TransactionBuilder } from '@stellar/stellar-sdk'
import type { PublicKey, StellarNetwork, XDR } from '@/types'

const LEDGER_STELLAR_PATH = "44'/148'/0'"

let activeTransport: TransportWebUSB | null = null

function mapLedgerError(error: unknown, fallback: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('disconnected') || lowerMessage.includes('device was disconnected')) {
    return new Error('Ledger device disconnected. Reconnect your Ledger and try again.')
  }

  if (lowerMessage.includes('denied') || lowerMessage.includes('reject')) {
    return new Error('Ledger request was rejected on the device.')
  }

  if (lowerMessage.includes('no device selected') || lowerMessage.includes('not found')) {
    return new Error('No Ledger device selected. Connect and unlock your Ledger, then try again.')
  }

  if (lowerMessage.includes('unsupported') || lowerMessage.includes('webusb')) {
    return new Error('Ledger WebUSB is not supported in this browser.')
  }

  return new Error(message || fallback)
}

async function createLedgerApp(): Promise<Str> {
  try {
    activeTransport = activeTransport ?? (await TransportWebUSB.request())
    return new Str(activeTransport)
  } catch (error) {
    throw mapLedgerError(error, 'Failed to connect Ledger device.')
  }
}

export async function isLedgerAvailable(): Promise<boolean> {
  try {
    return await TransportWebUSB.isSupported()
  } catch {
    return false
  }
}

export async function connectLedger(): Promise<PublicKey> {
  const app = await createLedgerApp()

  try {
    const { rawPublicKey } = await app.getPublicKey(LEDGER_STELLAR_PATH, true)
    return StrKey.encodeEd25519PublicKey(rawPublicKey)
  } catch (error) {
    throw mapLedgerError(error, 'Failed to retrieve the Ledger public key.')
  }
}

export async function signTransactionWithLedger(
  xdr: XDR,
  networkPassphrase: string,
  publicKey: PublicKey
): Promise<XDR> {
  const app = await createLedgerApp()

  try {
    const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase)
    const { signature } = await app.signTransaction(
      LEDGER_STELLAR_PATH,
      transaction.signatureBase()
    )

    transaction.addSignature(
      Keypair.fromPublicKey(publicKey).publicKey(),
      signature.toString('base64')
    )

    return transaction.toXDR()
  } catch (error) {
    throw mapLedgerError(error, 'Failed to sign transaction with Ledger.')
  }
}

export async function disconnectLedger(): Promise<void> {
  if (!activeTransport) return

  try {
    await activeTransport.close()
  } finally {
    activeTransport = null
  }
}

export function getLedgerNetwork(network: StellarNetwork): StellarNetwork {
  return network
}
