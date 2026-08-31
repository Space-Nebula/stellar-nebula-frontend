import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requestTransport,
  isSupported,
  closeTransport,
  getPublicKey,
  signTransaction,
  encodeEd25519PublicKey,
  fromXDR,
  signatureBase,
  addSignature,
  toXDR,
  fromPublicKey,
} = vi.hoisted(() => ({
  requestTransport: vi.fn(),
  isSupported: vi.fn(),
  closeTransport: vi.fn(),
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
  encodeEd25519PublicKey: vi.fn(),
  fromXDR: vi.fn(),
  signatureBase: vi.fn(),
  addSignature: vi.fn(),
  toXDR: vi.fn(),
  fromPublicKey: vi.fn(),
}))

vi.mock('@ledgerhq/hw-transport-webusb', () => ({
  default: {
    request: requestTransport,
    isSupported,
  },
}))

vi.mock('@ledgerhq/hw-app-str', () => ({
  default: function MockStr() {
    return {
      getPublicKey,
      signTransaction,
    }
  },
}))

vi.mock('@stellar/stellar-sdk', () => ({
  StrKey: {
    encodeEd25519PublicKey,
  },
  TransactionBuilder: {
    fromXDR,
  },
  Keypair: {
    fromPublicKey,
  },
}))

describe('Ledger wallet service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    closeTransport.mockResolvedValue(undefined)
    requestTransport.mockResolvedValue({ close: closeTransport })
    isSupported.mockResolvedValue(true)
    getPublicKey.mockResolvedValue({ rawPublicKey: Buffer.from('raw-key') })
    signTransaction.mockResolvedValue({ signature: Buffer.from('signature') })
    encodeEd25519PublicKey.mockReturnValue('GLEDGER123')
    signatureBase.mockReturnValue(Buffer.from('signature-base'))
    addSignature.mockReturnValue(undefined)
    toXDR.mockReturnValue('SIGNED_XDR')
    fromXDR.mockReturnValue({ signatureBase, addSignature, toXDR })
    fromPublicKey.mockReturnValue({ publicKey: () => 'GLEDGER123' })
  })

  it('reports WebUSB support', async () => {
    const { isLedgerAvailable } = await import('../ledger')

    await expect(isLedgerAvailable()).resolves.toBe(true)
    expect(isSupported).toHaveBeenCalled()
  })

  it('connects to Ledger and returns the encoded Stellar public key', async () => {
    const { connectLedger } = await import('../ledger')

    await expect(connectLedger()).resolves.toBe('GLEDGER123')
    expect(requestTransport).toHaveBeenCalled()
    expect(getPublicKey).toHaveBeenCalledWith("44'/148'/0'", true)
    expect(encodeEd25519PublicKey).toHaveBeenCalledWith(Buffer.from('raw-key'))
  })

  it('signs transaction XDR with the Ledger signature', async () => {
    const { signTransactionWithLedger } = await import('../ledger')

    await expect(
      signTransactionWithLedger('RAW_XDR', 'Test SDF Network ; September 2015', 'GLEDGER123')
    ).resolves.toBe('SIGNED_XDR')

    expect(fromXDR).toHaveBeenCalledWith('RAW_XDR', 'Test SDF Network ; September 2015')
    expect(signTransaction).toHaveBeenCalledWith("44'/148'/0'", Buffer.from('signature-base'))
    expect(addSignature).toHaveBeenCalledWith(
      'GLEDGER123',
      Buffer.from('signature').toString('base64')
    )
  })

  it('maps disconnection errors to actionable messages', async () => {
    const { connectLedger } = await import('../ledger')
    getPublicKey.mockRejectedValue(new Error('Device was disconnected'))

    await expect(connectLedger()).rejects.toThrow(
      'Ledger device disconnected. Reconnect your Ledger and try again.'
    )
  })

  it('closes the active transport on disconnect', async () => {
    const { connectLedger, disconnectLedger } = await import('../ledger')

    await connectLedger()
    await disconnectLedger()

    expect(closeTransport).toHaveBeenCalled()
  })
})
