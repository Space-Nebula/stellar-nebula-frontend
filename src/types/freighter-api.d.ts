declare module '@stellar/freighter-api' {
  export function isConnected(): boolean | Promise<boolean>
  export function getPublicKey(): string | Promise<string>
  export function signTransaction(
    xdr: string,
    options: { networkPassphrase: string; publicKey?: string }
  ): string | Promise<string>
  export function getNetwork(): string | Promise<string>
}
