
export interface MultiSigSignature {
  signer: string
  signature: string
  timestamp: number
}

export interface MultiSigTransaction {
  xdr: string
  threshold: number
  signers: string[]
  signatures: MultiSigSignature[]
  createdAt: number
}

export function createMultiSigTransaction(
  xdr: string,
  threshold: number,
  signers: string[]
): MultiSigTransaction {
  if (threshold < 1 || threshold > signers.length) {
    throw new Error('Threshold must be between 1 and the number of signers')
  }

  if (new Set(signers).size !== signers.length) {
    throw new Error('Duplicate signers not allowed')
  }

  return {
    xdr,
    threshold,
    signers,
    signatures: [],
    createdAt: Date.now(),
  }
}

export function addSignature(
  multiSig: MultiSigTransaction,
  signer: string,
  signature: string
): MultiSigTransaction {
  if (!multiSig.signers.includes(signer)) {
    throw new Error(`${signer} is not an authorized signer`)
  }

  const existing = multiSig.signatures.find((s) => s.signer === signer)
  if (existing) {
    return {
      ...multiSig,
      signatures: multiSig.signatures.map((s) =>
        s.signer === signer ? { ...s, signature, timestamp: Date.now() } : s
      ),
    }
  }

  return {
    ...multiSig,
    signatures: [
      ...multiSig.signatures,
      {
        signer,
        signature,
        timestamp: Date.now(),
      },
    ],
  }
}

export function canExecuteTransaction(multiSig: MultiSigTransaction): boolean {
  return multiSig.signatures.length >= multiSig.threshold
}

export function getRemainingSignatures(multiSig: MultiSigTransaction): number {
  return Math.max(0, multiSig.threshold - multiSig.signatures.length)
}

export function getSignatureProgress(multiSig: MultiSigTransaction): {
  current: number
  required: number
  percentage: number
} {
  const current = multiSig.signatures.length
  const required = multiSig.threshold
  const percentage = (current / required) * 100

  return {
    current: Math.min(current, required),
    required,
    percentage: Math.min(percentage, 100),
  }
}

export function validateSignerAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address)
}

export function serializeMultiSigTransaction(multiSig: MultiSigTransaction): string {
  return JSON.stringify(multiSig)
}

export function deserializeMultiSigTransaction(serialized: string): MultiSigTransaction {
  const parsed = JSON.parse(serialized)

  if (!parsed.xdr || !Array.isArray(parsed.signers) || typeof parsed.threshold !== 'number') {
    throw new Error('Invalid multi-sig transaction format')
  }

  return parsed as MultiSigTransaction
}
