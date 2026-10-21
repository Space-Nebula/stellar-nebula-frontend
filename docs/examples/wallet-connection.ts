import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api'
import albedo from '@albedo-link/intent'

export interface WalletState {
  address: string | null
  network: string
  walletType: 'freighter' | 'albedo' | null
  connected: boolean
}

/**
 * Connect to Freighter wallet.
 * Requests account public key and verifies extension presence.
 */
export async function connectFreighter(): Promise<WalletState> {
  const connected = await isConnected()
  if (!connected) {
    throw new Error('Freighter extension not found or locked.')
  }

  const { address, error } = await getAddress()
  if (error || !address) {
    throw new Error(`Failed to retrieve address from Freighter: ${error || 'Unknown error'}`)
  }

  return {
    address,
    network: 'TESTNET',
    walletType: 'freighter',
    connected: true,
  }
}

/**
 * Connect using Albedo web-based wallet.
 */
export async function connectAlbedo(): Promise<WalletState> {
  const result = await albedo.publicKey({
    require_existing: false,
  })

  return {
    address: result.pubkey,
    network: result.network || 'TESTNET',
    walletType: 'albedo',
    connected: true,
  }
}

/**
 * Sign an XDR payload with Freighter.
 */
export async function signWithFreighter(xdr: string, networkPassphrase: string): Promise<string> {
  const { signedTxXdr, error } = await signTransaction(xdr, {
    networkPassphrase,
  })

  if (error || !signedTxXdr) {
    throw new Error(`Freighter signing failed: ${error || 'No signed XDR returned'}`)
  }

  return signedTxXdr
}
