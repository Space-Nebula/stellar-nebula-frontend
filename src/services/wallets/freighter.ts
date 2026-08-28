import type { PublicKey, XDR, StellarNetwork } from '@/types'

interface FreighterClient {
  isConnected: () => boolean | Promise<boolean>
  getPublicKey: () => string | Promise<string>
  signTransaction: (
    xdr: string,
    options: { networkPassphrase: string; publicKey?: string }
  ) => string | Promise<string>
  getNetwork: () => string | Promise<string>
}

async function loadFreighter(): Promise<FreighterClient> {
  const packageName = '@stellar/freighter-api'
  return (await import(/* @vite-ignore */ packageName)) as FreighterClient
}

/**
 * Check whether the Freighter browser extension is installed.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const freighter = await loadFreighter()
    return Boolean(await freighter.isConnected())
  } catch {
    // Freighter may not be installed or the module might not be resolvable.
    // Fall back to checking the global window.
    const anyWindow = window as unknown as Record<string, unknown>
    return typeof anyWindow.freighter !== 'undefined' || typeof anyWindow.stellar !== 'undefined'
  }
}

/**
 * Request the user's public key via the Freighter extension.
 */
export async function connectFreighter(): Promise<PublicKey> {
  const freighter = await loadFreighter()
  return freighter.getPublicKey()
}

/**
 * Sign a transaction XDR with Freighter.
 */
export async function signTransactionWithFreighter(
  xdr: XDR,
  networkPassphrase: string,
  publicKey?: string
): Promise<XDR> {
  const freighter = await loadFreighter()
  return freighter.signTransaction(xdr, {
    networkPassphrase,
    ...(publicKey ? { publicKey } : {}),
  })
}

/**
 * Get the network that Freighter is currently connected to.
 */
export async function getFreighterNetwork(): Promise<StellarNetwork> {
  try {
    const freighter = await loadFreighter()
    const network = await freighter.getNetwork()
    const networkMap: Record<string, StellarNetwork> = {
      public: 'mainnet',
      testnet: 'testnet',
      futurenet: 'futurenet',
    }
    return networkMap[network.toLowerCase()] ?? 'testnet'
  } catch {
    return 'testnet'
  }
}
