import * as StellarSdk from '@stellar/stellar-sdk'

export interface SubmitTransactionOptions {
  rpcUrl: string
  networkPassphrase: string
  sourceSecretOrSigner: (txXdr: string) => Promise<string>
}

/**
 * Builds, signs, and submits a Stellar payment operation.
 */
export async function sendStellarPayment(
  sourceKey: string,
  destinationKey: string,
  amount: string,
  options: SubmitTransactionOptions
): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
  const server = new StellarSdk.Horizon.Server(options.rpcUrl)

  // 1. Fetch account sequence
  const sourceAccount = await server.loadAccount(sourceKey)

  // 2. Build payment transaction
  const fee = await server.fetchBaseFee()
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: options.networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationKey,
        asset: StellarSdk.Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build()

  // 3. Sign transaction
  const signedXdr = await options.sourceSecretOrSigner(transaction.toXDR())
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, options.networkPassphrase)

  // 4. Submit to Horizon
  return (await server.submitTransaction(
    signedTx
  )) as StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse
}
