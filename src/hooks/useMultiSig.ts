import { useState, useCallback } from 'react'
import type { MultiSigTransaction } from '@/utils/multisig-utils'
import {
  createMultiSigTransaction,
  addSignature,
  canExecuteTransaction,
  getRemainingSignatures,
  getSignatureProgress,
  validateSignerAddress,
  serializeMultiSigTransaction,
  deserializeMultiSigTransaction,
} from '@/utils/multisig-utils'
import { getErrorMessage } from '@utils/error-messages'

export function useMultiSig() {
  const [transaction, setTransaction] = useState<MultiSigTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const initializeTransaction = useCallback(
    (xdr: string, threshold: number, signers: string[]) => {
      try {
        setError(null)

        for (const signer of signers) {
          if (!validateSignerAddress(signer)) {
            throw new Error(`Invalid signer address: ${signer}`)
          }
        }

        const multiSig = createMultiSigTransaction(xdr, threshold, signers)
        setTransaction(multiSig)
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to initialize transaction')
        setError(message)
      }
    },
    []
  )

  const addSignatureToTransaction = useCallback((signer: string, signature: string) => {
    try {
      if (!transaction) {
        throw new Error('No transaction initialized')
      }

      if (!validateSignerAddress(signer)) {
        throw new Error(`Invalid signer address: ${signer}`)
      }

      setError(null)
      const updated = addSignature(transaction, signer, signature)
      setTransaction(updated)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to add signature')
      setError(message)
    }
  }, [transaction])

  const isReady = useCallback(() => {
    if (!transaction) return false
    return canExecuteTransaction(transaction)
  }, [transaction])

  const getProgress = useCallback(() => {
    if (!transaction) return { current: 0, required: 0, percentage: 0 }
    return getSignatureProgress(transaction)
  }, [transaction])

  const getRemainingCount = useCallback(() => {
    if (!transaction) return 0
    return getRemainingSignatures(transaction)
  }, [transaction])

  const exportTransaction = useCallback(() => {
    if (!transaction) return null
    return serializeMultiSigTransaction(transaction)
  }, [transaction])

  const importTransaction = useCallback((serialized: string) => {
    try {
      setError(null)
      const imported = deserializeMultiSigTransaction(serialized)
      setTransaction(imported)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to import transaction')
      setError(message)
    }
  }, [])

  const resetTransaction = useCallback(() => {
    setTransaction(null)
    setError(null)
  }, [])

  return {
    transaction,
    error,
    isLoading,
    initializeTransaction,
    addSignature: addSignatureToTransaction,
    isReady,
    getProgress,
    getRemainingCount,
    exportTransaction,
    importTransaction,
    resetTransaction,
  }
}
