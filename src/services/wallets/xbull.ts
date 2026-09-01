import type { PublicKey, StellarNetwork, XDR } from '@/types'

/**
 * xBull browser extension API interface.
 * xBull exposes a global `window.xbull` object with connect/sign methods.
 */
interface XBullClient {
  connect: () => Promise<string>
  sign: (xdr: string, network?: string) => Promise<string>
  getNetwork: () => Promise<string>
  isConnected: () => Promise<boolean>
}

/**
 * Load the xBull client from the browser extension global.
 */
async function loadXBull(): Promise<XBullClient> {
  const anyWindow = window as unknown as Record<string, unknown>

  // xBull injects `window.xbull` when the extension is installed
  const xbull = anyWindow.xbull as XBullClient | undefined
  if (xbull) return xbull

  throw new Error('xBull wallet is not installed')
}

/**
 * Check whether the xBull browser extension is installed.
 */
export async function isXBullInstalled(): Promise<boolean> {
  try {
    const xbull = await loadXBull()
    return Boolean(await xbull.isConnected())
  } catch {
    return false
  }
}

/**
 * Request the user's public key via the xBull extension.
 */
export async function connectXBull(): Promise<PublicKey> {
  const xbull = await loadXBull()
  const publicKey = await xbull.connect()

  if (!publicKey) {
    throw new Error('xBull did not return a public key')
  }

  return publicKey
}

/**
 * Sign a transaction XDR with xBull.
 */
export async function signTransactionWithXBull(xdr: XDR, networkPassphrase: string): Promise<XDR> {
  const xbull = await loadXBull()

  // xBull expects a network passphrase string; pass it directly
  const signedXdr = await xbull.sign(xdr, networkPassphrase)

  if (!signedXdr) {
    throw new Error('xBull did not return a signed transaction')
  }

  return signedXdr
}

/**
 * Get the network that xBull is currently connected to.
 */
export async function getXBullNetwork(): Promise<StellarNetwork> {
  try {
    const xbull = await loadXBull()
    const network = await xbull.getNetwork()
    const networkMap: Record<string, StellarNetwork> = {
      public: 'mainnet',
      mainnet: 'mainnet',
      testnet: 'testnet',
      futurenet: 'futurenet',
    }
    return networkMap[network.toLowerCase()] ?? 'testnet'
  } catch {
    return 'testnet'
  }
}
