import type { StellarNetwork } from '@/types'

export interface WalletConnectPairing {
  topic: string
  publicKey: string
  network: StellarNetwork
}

const WC_STORAGE_KEY = 'stellar-nebula:walletconnect'

let signClient: unknown = null

async function getSignClient() {
  if (signClient) return signClient

  try {
    const [{ SignClient }] = await Promise.all([
      import('@walletconnect/sign-client'),
      import('@walletconnect/modal'),
    ])

    signClient = await SignClient.init({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '',
      metadata: {
        name: 'Nebula Nomad',
        description: 'Space Exploration on Stellar',
        url: window.location.origin,
        icons: [`${window.location.origin}/icon-192.png`],
      },
    })

    return signClient
  } catch (error) {
    throw new Error(
      `Failed to initialize WalletConnect: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function isWalletConnectAvailable(): boolean {
  return true
}

export async function connectWalletConnect(
  network: StellarNetwork
): Promise<{ publicKey: string; session: unknown }> {
  const client = await getSignClient()

  const requiredNamespaces = {
    stellar: {
      methods: ['stellar_signAndSubmitXDR', 'stellar_signXDR', 'stellar_getPublicKey'],
      chains: [`stellar:${network}`],
      events: [],
    },
  }

  const { approval } = await client.connect({
    requiredNamespaces,
  })

  const session = await approval()
  const accounts = Object.values(session.namespaces)
    .flatMap((namespace: { accounts?: string[] }) => namespace.accounts ?? [])
    .map((account: string) => account.split(':')[2])
    .filter(Boolean)

  const publicKey = accounts[0]
  if (!publicKey) {
    throw new Error('No public key returned from WalletConnect session')
  }

  persistWalletConnectSession({ topic: session.topic, publicKey, network })

  return { publicKey, session }
}

export function signTransactionWithWalletConnect(
  xdr: string,
  network: StellarNetwork,
  session: unknown
): Promise<string> {
  const wcSession = session as { topic: string }

  return new Promise(async (resolve, reject) => {
    try {
      const client = await getSignClient()

      const result = await client.request({
        topic: wcSession.topic,
        chainId: `stellar:${network}`,
        request: {
          method: 'stellar_signXDR',
          params: { xdr },
        },
      })

      resolve(result.signedXDR ?? result)
    } catch (error) {
      reject(error)
    }
  })
}

export function getWalletConnectNetwork(): StellarNetwork {
  const session = loadWalletConnectSession()
  return session?.network ?? 'futurenet'
}

export function disconnectWalletConnect(): void {
  try {
    localStorage.removeItem(WC_STORAGE_KEY)
    signClient = null
  } catch {
    // Ignore
  }
}

function persistWalletConnectSession(pairing: WalletConnectPairing): void {
  try {
    localStorage.setItem(WC_STORAGE_KEY, JSON.stringify(pairing))
  } catch {
    // Ignore quota errors
  }
}

export function loadWalletConnectSession(): WalletConnectPairing | null {
  try {
    const raw = localStorage.getItem(WC_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WalletConnectPairing) : null
  } catch {
    return null
  }
}
