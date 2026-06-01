import { useCallback, useState } from 'react'
import { TransactionBuilder, rpc, type Transaction } from '@stellar/stellar-sdk'
import { env } from '@config/env'
import { useWallet } from '@contexts/WalletContext'
import type { XDR } from '@/types'
import type { StellarNetwork } from '@/types'
import {
  STELLAR_FUTURENET_PASSPHRASE,
  STELLAR_MAINNET_PASSPHRASE,
  STELLAR_TESTNET_PASSPHRASE,
} from '@constants/stellar'

export type BuildTransactionFn = () => Promise<XDR | Transaction>

export interface TransactionSubmissionResult {
  hash: string
  sendStatus: string
  signedXdr: XDR
  pollStatus?: string
  txHash?: string
}

export interface SignTransactionOptions {
  rpcUrl?: string
  networkPassphrase?: string
}

interface UseSignTransactionReturn {
  signAndSubmit: (
    buildTransaction: BuildTransactionFn,
    options?: SignTransactionOptions
  ) => Promise<TransactionSubmissionResult | null>
  isLoading: boolean
  error: string | null
  result: TransactionSubmissionResult | null
  reset: () => void
}

function asMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function getStatus(value: unknown): string {
  return typeof value === 'string' ? value : 'UNKNOWN'
}

function getNetworkPassphrase(network: StellarNetwork | null): string {
  if (network === 'mainnet') return STELLAR_MAINNET_PASSPHRASE
  if (network === 'futurenet') return STELLAR_FUTURENET_PASSPHRASE
  return STELLAR_TESTNET_PASSPHRASE
}

function extractFailureDetails(result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const withErrorResult = result as { errorResult?: { toXDR?: (fmt?: string) => string } }
  const withResultXdr = result as { resultXdr?: string }
  const errorXdr = withErrorResult.errorResult?.toXDR?.('base64')
  return errorXdr ?? withResultXdr.resultXdr ?? ''
}

function formatSendError(sendResult: unknown): string {
  if (!sendResult || typeof sendResult !== 'object') {
    return 'Transaction submission failed with an unknown error.'
  }

  const xdr = extractFailureDetails(sendResult)
  return xdr
    ? `Transaction submission failed: ${xdr}`
    : 'Transaction submission failed before it could be accepted by the network.'
}

export function useSignTransaction(): UseSignTransactionReturn {
  const { walletState, signTransaction } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransactionSubmissionResult | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  const signAndSubmit = useCallback(
    async (
      buildTransaction: BuildTransactionFn,
      options?: SignTransactionOptions
    ): Promise<TransactionSubmissionResult | null> => {
      if (!walletState.isConnected || !walletState.publicKey || !walletState.network) {
        const message = 'Connect a supported wallet before signing transactions.'
        setError(message)
        return null
      }

      if (isLoading) {
        setError('Transaction submission already in progress.')
        return null
      }

      setIsLoading(true)
      setError(null)
      setResult(null)

      const networkPassphrase =
        options?.networkPassphrase ??
        (walletState.network ? getNetworkPassphrase(walletState.network) : env.STELLAR_PASSPHRASE)
      const rpcServer = new rpc.Server(options?.rpcUrl ?? env.STELLAR_RPC_URL)

      try {
        const buildOutput = await buildTransaction()
        const unsignedXdr = typeof buildOutput === 'string' ? buildOutput : buildOutput.toXDR()

        const signedXdr = await signTransaction(unsignedXdr)
        if (!signedXdr) {
          throw new Error('Transaction signing was cancelled or rejected by the wallet.')
        }

        let tx: Transaction
        try {
          tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)
        } catch {
          throw new Error(
            'Signed transaction could not be parsed for the selected network. Verify wallet network and passphrase.'
          )
        }

        const sendResult = await rpcServer.sendTransaction(tx)
        const sendStatus = getStatus((sendResult as { status?: unknown }).status)

        if (sendStatus === 'ERROR') {
          throw new Error(formatSendError(sendResult))
        }

        if (
          !(sendResult as { hash?: unknown }).hash ||
          typeof (sendResult as { hash?: unknown }).hash !== 'string'
        ) {
          throw new Error('Transaction submission did not return a transaction hash.')
        }

        const hash = (sendResult as { hash: string }).hash
        const submissionResult: TransactionSubmissionResult = {
          hash,
          sendStatus,
          signedXdr,
        }

        if (sendStatus === 'PENDING' || sendStatus === 'DUPLICATE') {
          const finalResult = await rpcServer.pollTransaction(hash)
          const pollStatus = getStatus((finalResult as { status?: unknown }).status)
          submissionResult.pollStatus = pollStatus

          if (pollStatus === 'FAILED') {
            const details = extractFailureDetails(finalResult)
            throw new Error(
              details ? `Transaction failed on-chain: ${details}` : 'Transaction failed on-chain.'
            )
          }

          if (pollStatus === 'NOT_FOUND') {
            throw new Error('Transaction was submitted but could not be found on the network.')
          }

          if (pollStatus === 'ERROR') {
            throw new Error('Network error while polling transaction status.')
          }

          if (
            pollStatus === 'SUCCESS' &&
            typeof (finalResult as { txHash?: unknown }).txHash === 'string'
          ) {
            submissionResult.txHash = (finalResult as { txHash: string }).txHash
          }
        } else if (sendStatus === 'SUCCESS') {
          submissionResult.txHash = hash
        } else {
          throw new Error(`Unexpected transaction submission status: ${sendStatus}`)
        }

        setResult(submissionResult)
        return submissionResult
      } catch (err) {
        const message = asMessage(err, 'Failed to sign and submit transaction.')
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [signTransaction, walletState.isConnected, walletState.network, walletState.publicKey]
  )

  return {
    signAndSubmit,
    isLoading,
    error,
    result,
    reset,
  }
}
