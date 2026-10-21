import type { StellarNetwork } from '@/types'
import {
  buildWalletConnectNamespaces,
  getWalletConnectChainId,
  getWalletConnectMetadata,
  getWalletConnectProjectId,
  isWalletConnectConfigured,
  WALLETCONNECT_STORAGE_KEY,
} from '@config/walletconnect'
// Type-only: the client itself is still loaded lazily in `getSignClient`.
import type SignClient from '@walletconnect/sign-client'

export interface WalletConnectPairing {
  topic: string
  publicKey: string
  network: StellarNetwork
}

const WC_STORAGE_KEY = WALLETCONNECT_STORAGE_KEY

let signClient: SignClient | null = null

async function getSignClient(): Promise<SignClient> {
  if (signClient) return signClient

  try {
    const [{ SignClient: SignClientModule }] = await Promise.all([
      import('@walletconnect/sign-client'),
      import('@walletconnect/modal'),
    ])

    const projectId = getWalletConnectProjectId()
    if (!projectId) {
      throw new Error(
        'WalletConnect project ID is missing. Set VITE_WALLETCONNECT_PROJECT_ID in your environment variables.'
      )
    }

    const client = await SignClientModule.init({
      projectId,
      metadata: getWalletConnectMetadata(),
    })
    signClient = client

    return client
  } catch (error) {
    throw new Error(
      `Failed to initialize WalletConnect: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export function isWalletConnectAvailable(): boolean {
  return typeof window !== 'undefined' && isWalletConnectConfigured()
}

export async function connectWalletConnect(
  network: StellarNetwork
): Promise<{ publicKey: string; session: unknown }> {
  const client = await getSignClient()

  const { approval } = await client.connect({
    requiredNamespaces: buildWalletConnectNamespaces(network),
  })

  const session = await approval()
  const accounts = Object.values(session.namespaces)
    .flatMap((namespace: unknown) => (namespace as { accounts?: string[] }).accounts ?? [])
    .map((account: string) => account.split(':')[2])
    .filter(Boolean)

  const publicKey = accounts[0]
  if (!publicKey) {
    throw new Error('No public key returned from WalletConnect session')
  }

  persistWalletConnectSession({ topic: session.topic, publicKey, network })

  return { publicKey, session }
}

export async function signTransactionWithWalletConnect(
  xdr: string,
  network: StellarNetwork,
  session: unknown
): Promise<string> {
  const wcSession = session as { topic: string }
  const client = await getSignClient()

  // Wallets differ: some return `{ signedXDR }`, others the signed XDR string itself.
  const result = await client.request<{ signedXDR?: string } | string>({
    topic: wcSession.topic,
    chainId: getWalletConnectChainId(network),
    request: {
      method: 'stellar_signXDR',
      params: { xdr },
    },
  })

  const signed = typeof result === 'string' ? result : result?.signedXDR
  if (!signed) throw new Error('WalletConnect did not return a signed transaction')
  return signed
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
