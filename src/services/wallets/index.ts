export {
  isFreighterInstalled,
  connectFreighter,
  getFreighterNetwork,
  signTransactionWithFreighter,
} from './freighter'

export {
  isAlbedoAvailable,
  connectAlbedo,
  signTransactionWithAlbedo,
  getAlbedoNetwork,
} from './albedo'

export {
  isWalletConnectAvailable,
  connectWalletConnect,
  signTransactionWithWalletConnect,
  getWalletConnectNetwork,
  disconnectWalletConnect,
  loadWalletConnectSession,
} from './walletconnect'

export {
  validateNetworkMatch,
  getNetworkMismatchMessage,
  supportsNetworkSwitching,
} from './networkValidation'

export { handleWalletConnectionError, formatWalletError } from './errorHandling'
export type { WalletError } from './errorHandling'
