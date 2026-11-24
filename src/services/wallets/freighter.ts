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
 * Synchronous / immediate check whether Freighter window object or package is present.
 */
async function checkFreighterAvailable(): Promise<boolean> {
  try {
    const freighter = await loadFreighter()
    return Boolean(await freighter.isConnected())
  } catch {
    if (typeof window === 'undefined') return false
    const anyWindow = window as unknown as Record<string, unknown>
    return typeof anyWindow.freighter !== 'undefined' || typeof anyWindow.stellar !== 'undefined'
  }
}

/**
 * Check whether the Freighter browser extension is installed.
 * Supports an optional parameter to wait for asynchronous injection (e.g. on Firefox) (#546).
 */
export async function isFreighterInstalled(waitForInjection: boolean = false): Promise<boolean> {
  if (waitForInjection) {
    return detectFreighterWithRetry(3000, 100)
  }
  return checkFreighterAvailable()
}

/**
 * Detect Freighter with exponential backoff and event listener support (#546).
 * Solves the Firefox race condition where window.freighter is injected asynchronously after delay.
 * Waits up to timeoutMs (default: 3000ms) before declaring Freighter absent.
 */
export async function detectFreighterWithRetry(
  timeoutMs: number = 3000,
  initialDelayMs: number = 100
): Promise<boolean> {
  if (await checkFreighterAvailable()) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false
    let currentDelay = initialDelayMs
    const startTime = Date.now()

    const onFreighterLoaded = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve(true)
      }
    }

    const cleanup = () => {
      window.removeEventListener('FreighterLoaded', onFreighterLoaded)
      window.removeEventListener('freighter:ready', onFreighterLoaded)
    }

    // Listen for custom events dispatched by Freighter extension
    window.addEventListener('FreighterLoaded', onFreighterLoaded)
    window.addEventListener('freighter:ready', onFreighterLoaded)

    const poll = async () => {
      if (resolved) return

      if (await checkFreighterAvailable()) {
        resolved = true
        cleanup()
        resolve(true)
        return
      }

      const elapsed = Date.now() - startTime
      if (elapsed >= timeoutMs) {
        resolved = true
        cleanup()
        resolve(false)
        return
      }

      const nextDelay = Math.min(currentDelay * 1.5, Math.max(50, timeoutMs - elapsed))
      currentDelay = currentDelay * 1.5
      setTimeout(() => void poll(), Math.max(20, nextDelay))
    }

    setTimeout(() => void poll(), initialDelayMs)
  })
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
