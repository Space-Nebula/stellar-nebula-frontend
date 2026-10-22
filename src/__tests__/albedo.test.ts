import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import albedo from '@albedo-link/intent'
import type * as WalletServicesModule from '@services/wallets'
import {
  connectAlbedo,
  getAlbedoNetwork,
  isAlbedoAvailable,
  signTransactionWithAlbedo,
} from '@services/wallets'
import { ALBEDO_NETWORK_PASSPHRASES, useAlbedo, type UseAlbedoReturn } from '@hooks/useAlbedo'

const albedoAvailability = vi.hoisted(() => ({ available: true }))

vi.mock('@services/wallets', async (importOriginal) => {
  const actual = await importOriginal<typeof WalletServicesModule>()
  return { ...actual, isAlbedoAvailable: () => albedoAvailability.available }
})

vi.mock('@albedo-link/intent', () => {
  const publicKey = vi.fn()
  const tx = vi.fn()
  const info = vi.fn()

  return {
    publicKey,
    tx,
    info,
    default: { publicKey, tx, info },
  }
})

type PublicKeyResult = Awaited<ReturnType<typeof albedo.publicKey>>
type TxResult = Awaited<ReturnType<typeof albedo.tx>>
type InfoApi = { info?: () => Promise<{ network?: string; supported_intents?: string[] }> }
type InfoResult = NonNullable<Awaited<ReturnType<NonNullable<InfoApi['info']>>>>

/** `info` is not part of the published typings, but the runtime mock provides it. */
const albedoInfo = (
  albedo as unknown as {
    info: {
      mockResolvedValue: (value: InfoResult) => void
      mockRejectedValue: (error: Error) => void
    }
  }
).info

const PUBLIC_KEY = 'GALBEDOTESTPUBLICKEY000000000000000000000000000000000000'
const RAW_XDR = 'AAAAAgAAAAA...raw'
const SIGNED_XDR = 'AAAAAgAAAAA...signed'

function publicKeyResult(overrides: Partial<PublicKeyResult> = {}): PublicKeyResult {
  return {
    pubkey: PUBLIC_KEY,
    intent: 'public_key',
    signature: '',
    ...overrides,
  } as PublicKeyResult
}

function txResult(overrides: Partial<TxResult> = {}): TxResult {
  return {
    signed_envelope_xdr: SIGNED_XDR,
    intent: 'tx',
    xdr: RAW_XDR,
    pubkey: PUBLIC_KEY,
    network: 'testnet',
    ...overrides,
  } as TxResult
}

function infoResult(overrides: Partial<InfoResult> = {}): InfoResult {
  return { network: 'testnet', supported_intents: ['public_key', 'tx'], ...overrides } as InfoResult
}

async function connectAlbedoHook(result: { current: UseAlbedoReturn }) {
  await act(async () => {
    await result.current.connect()
  })
}

describe('Albedo service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    albedoAvailability.available = true
  })

  describe('isAlbedoAvailable', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('is available in a browser context', () => {
      expect(isAlbedoAvailable()).toBe(true)
    })

    it('is unavailable when there is no window (SSR)', async () => {
      const actualServices = await vi.importActual<typeof WalletServicesModule>('@services/wallets')
      vi.stubGlobal('window', undefined)
      expect(actualServices.isAlbedoAvailable()).toBe(false)
    })
  })

  describe('connectAlbedo', () => {
    it('returns the public key reported by the popup', async () => {
      vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult())

      await expect(connectAlbedo()).resolves.toBe(PUBLIC_KEY)
      expect(albedo.publicKey).toHaveBeenCalledTimes(1)
    })

    it('throws a clear error when Albedo returns no public key', async () => {
      vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult({ pubkey: undefined }))

      await expect(connectAlbedo()).rejects.toThrow('Albedo did not return a public key')
    })

    it('propagates a user rejection from the popup', async () => {
      vi.mocked(albedo.publicKey).mockRejectedValue(new Error('User rejected the request'))

      await expect(connectAlbedo()).rejects.toThrow(/rejected/i)
    })

    it('propagates popup/load failures', async () => {
      vi.mocked(albedo.publicKey).mockRejectedValue(new Error('Popup was blocked'))

      await expect(connectAlbedo()).rejects.toThrow('Popup was blocked')
    })

    it('unwraps the { error } rejection shape used by the intent transport', async () => {
      vi.mocked(albedo.publicKey).mockRejectedValue({
        error: { code: -4, message: 'User rejected the request' },
      })

      await expect(connectAlbedo()).rejects.toThrow('User rejected the request')
    })

    it('turns an unrelated rejection object into an Error with a usable message', async () => {
      vi.mocked(albedo.publicKey).mockRejectedValue({ code: -1 })

      await expect(connectAlbedo()).rejects.toThrow('Albedo request failed')
    })
  })

  describe('signTransactionWithAlbedo', () => {
    it('returns the signed envelope XDR', async () => {
      vi.mocked(albedo.tx).mockResolvedValue(txResult())

      await expect(
        signTransactionWithAlbedo(RAW_XDR, ALBEDO_NETWORK_PASSPHRASES.testnet)
      ).resolves.toBe(SIGNED_XDR)
      expect(albedo.tx).toHaveBeenCalledWith(
        expect.objectContaining({
          xdr: RAW_XDR,
          network: 'testnet',
          network_passphrase: ALBEDO_NETWORK_PASSPHRASES.testnet,
        })
      )
    })

    it('maps the mainnet passphrase to the Albedo default network', async () => {
      vi.mocked(albedo.tx).mockResolvedValue(txResult())

      await signTransactionWithAlbedo(RAW_XDR, ALBEDO_NETWORK_PASSPHRASES.mainnet)

      expect(albedo.tx).toHaveBeenCalledWith(
        expect.objectContaining({
          network: undefined,
          network_passphrase: ALBEDO_NETWORK_PASSPHRASES.mainnet,
        })
      )
    })

    it('maps the futurenet passphrase to the futurenet intent network', async () => {
      vi.mocked(albedo.tx).mockResolvedValue(txResult({ network: 'futurenet' }))

      await signTransactionWithAlbedo(RAW_XDR, ALBEDO_NETWORK_PASSPHRASES.futurenet)

      expect(albedo.tx).toHaveBeenCalledWith(expect.objectContaining({ network: 'futurenet' }))
    })

    it('throws when Albedo returns no signed envelope', async () => {
      vi.mocked(albedo.tx).mockResolvedValue(txResult({ signed_envelope_xdr: undefined }))

      await expect(
        signTransactionWithAlbedo(RAW_XDR, ALBEDO_NETWORK_PASSPHRASES.testnet)
      ).rejects.toThrow('Albedo did not return a signed transaction')
    })

    it('propagates a rejection from the signing popup', async () => {
      vi.mocked(albedo.tx).mockRejectedValue(new Error('User rejected the transaction'))

      await expect(
        signTransactionWithAlbedo(RAW_XDR, ALBEDO_NETWORK_PASSPHRASES.testnet)
      ).rejects.toThrow(/rejected/i)
    })
  })

  describe('getAlbedoNetwork', () => {
    it.each([
      ['testnet', 'testnet'],
      ['pubnet', 'mainnet'],
      ['public', 'mainnet'],
      ['mainnet', 'mainnet'],
      ['futurenet', 'futurenet'],
      ['TESTNET', 'testnet'],
    ])('maps %s to %s', async (reported, expected) => {
      albedoInfo.mockResolvedValue(infoResult({ network: reported }))

      await expect(getAlbedoNetwork()).resolves.toBe(expected)
    })

    it('falls back to testnet for an unknown network', async () => {
      albedoInfo.mockResolvedValue(infoResult({ network: 'sandbox' }))

      await expect(getAlbedoNetwork()).resolves.toBe('testnet')
    })

    it('falls back to testnet when the info intent is unavailable', async () => {
      albedoInfo.mockRejectedValue(new Error('intent not supported'))

      await expect(getAlbedoNetwork()).resolves.toBe('testnet')
    })
  })
})

describe('useAlbedo hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    albedoAvailability.available = true
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts disconnected with no error', () => {
    const { result } = renderHook(() => useAlbedo())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.publicKey).toBeNull()
    expect(result.current.network).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('connects, stores the public key and detected network', async () => {
    vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult())
    albedoInfo.mockResolvedValue(infoResult({ network: 'pubnet' }))

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    expect(result.current.isConnected).toBe(true)
    expect(result.current.publicKey).toBe(PUBLIC_KEY)
    expect(result.current.network).toBe('mainnet')
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('sets an actionable error when the user rejects the connection', async () => {
    vi.mocked(albedo.publicKey).mockRejectedValue(new Error('User rejected the request'))

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toMatch(/rejected/i)
  })

  it('sets an error instead of connecting when Albedo is unavailable', async () => {
    albedoAvailability.available = false

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    expect(result.current.isAvailable).toBe(false)
    expect(result.current.error).toMatch(/not available/i)
    expect(albedo.publicKey).not.toHaveBeenCalled()
  })

  it('times out a popup that never answers', async () => {
    vi.useFakeTimers()
    vi.mocked(albedo.publicKey).mockReturnValue(new Promise(() => {}) as never)

    const { result } = renderHook(() => useAlbedo())
    let connectPromise: Promise<unknown>
    act(() => {
      connectPromise = result.current.connect()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000)
      await connectPromise!
    })

    expect(result.current.error).toMatch(/timed out/i)
    expect(result.current.isConnected).toBe(false)
  })

  it('clears the connection on disconnect', async () => {
    vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult())
    albedoInfo.mockResolvedValue(infoResult())

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    act(() => result.current.disconnect())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.publicKey).toBeNull()
    expect(result.current.network).toBeNull()
  })

  it('refuses to sign before connecting', async () => {
    const { result } = renderHook(() => useAlbedo())

    let signed: string | null = null
    await act(async () => {
      signed = await result.current.signTransaction(RAW_XDR)
    })

    expect(signed).toBeNull()
    expect(result.current.error).toMatch(/connect albedo/i)
    expect(albedo.tx).not.toHaveBeenCalled()
  })

  it('signs for the connected network', async () => {
    vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult())
    albedoInfo.mockResolvedValue(infoResult({ network: 'testnet' }))
    vi.mocked(albedo.tx).mockResolvedValue(txResult())

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    let signed: string | null = null
    await act(async () => {
      signed = await result.current.signTransaction(RAW_XDR)
    })

    expect(signed).toBe(SIGNED_XDR)
    expect(albedo.tx).toHaveBeenCalledWith(
      expect.objectContaining({
        xdr: RAW_XDR,
        network: 'testnet',
        network_passphrase: ALBEDO_NETWORK_PASSPHRASES.testnet,
      })
    )
  })

  it('signs for an explicitly requested network', async () => {
    vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult())
    albedoInfo.mockResolvedValue(infoResult())
    vi.mocked(albedo.tx).mockResolvedValue(txResult({ network: 'futurenet' }))

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    await act(async () => {
      await result.current.signTransaction(RAW_XDR, 'futurenet')
    })

    expect(albedo.tx).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'futurenet',
        network_passphrase: ALBEDO_NETWORK_PASSPHRASES.futurenet,
      })
    )
  })

  it('reports signing failures without dropping the connection', async () => {
    vi.mocked(albedo.publicKey).mockResolvedValue(publicKeyResult())
    albedoInfo.mockResolvedValue(infoResult())
    vi.mocked(albedo.tx).mockRejectedValue(new Error('User rejected the transaction'))

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)

    let signed: string | null = null
    await act(async () => {
      signed = await result.current.signTransaction(RAW_XDR)
    })

    expect(signed).toBeNull()
    expect(result.current.error).toMatch(/rejected/i)
    expect(result.current.isConnected).toBe(true)
  })

  it('exposes clearError for dismissing messages', async () => {
    vi.mocked(albedo.publicKey).mockRejectedValue(new Error('Popup was blocked'))

    const { result } = renderHook(() => useAlbedo())
    await connectAlbedoHook(result)
    expect(result.current.error).toBeTruthy()

    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })
})
